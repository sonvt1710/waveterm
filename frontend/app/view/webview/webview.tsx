// Copyright 2024, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { getApi, getSettingsKeyAtom, openLink } from "@/app/store/global";
import { getSimpleControlShiftAtom } from "@/app/store/keymodel";
import { ObjectService } from "@/app/store/services";
import { RpcApi } from "@/app/store/wshclientapi";
import { WindowRpcClient } from "@/app/store/wshrpcutil";
import { NodeModel } from "@/layout/index";
import { WOS, globalStore } from "@/store/global";
import { adaptFromReactOrNativeKeyEvent, checkKeyPressed } from "@/util/keyutil";
import { fireAndForget } from "@/util/util";
import clsx from "clsx";
import { WebviewTag } from "electron";
import { Atom, PrimitiveAtom, atom, useAtomValue } from "jotai";
import React, { memo, useEffect, useState } from "react";
import "./webview.less";

let webviewPreloadUrl = null;

function getWebviewPreloadUrl() {
    if (webviewPreloadUrl == null) {
        webviewPreloadUrl = getApi().getWebviewPreload();
        console.log("webviewPreloadUrl", webviewPreloadUrl);
    }
    if (webviewPreloadUrl == null) {
        return null;
    }
    return "file://" + webviewPreloadUrl;
}

export class WebViewModel implements ViewModel {
    viewType: string;
    blockId: string;
    blockAtom: Atom<Block>;
    viewIcon: Atom<string | IconButtonDecl>;
    viewName: Atom<string>;
    viewText: Atom<HeaderElem[]>;
    url: PrimitiveAtom<string>;
    homepageUrl: Atom<string>;
    urlInputFocused: PrimitiveAtom<boolean>;
    isLoading: PrimitiveAtom<boolean>;
    urlWrapperClassName: PrimitiveAtom<string>;
    refreshIcon: PrimitiveAtom<string>;
    webviewRef: React.RefObject<WebviewTag>;
    urlInputRef: React.RefObject<HTMLInputElement>;
    nodeModel: NodeModel;
    endIconButtons?: Atom<IconButtonDecl[]>;
    mediaPlaying: PrimitiveAtom<boolean>;
    mediaMuted: PrimitiveAtom<boolean>;

    constructor(blockId: string, nodeModel: NodeModel) {
        this.nodeModel = nodeModel;
        this.viewType = "web";
        this.blockId = blockId;
        this.blockAtom = WOS.getWaveObjectAtom<Block>(`block:${blockId}`);

        this.url = atom();
        const defaultUrlAtom = getSettingsKeyAtom("web:defaulturl");
        this.homepageUrl = atom((get) => {
            const defaultUrl = get(defaultUrlAtom);
            const pinnedUrl = get(this.blockAtom).meta.pinnedurl;
            console.log("homepageUrl", pinnedUrl, defaultUrl);
            return pinnedUrl ?? defaultUrl;
        });
        this.urlWrapperClassName = atom("");
        this.urlInputFocused = atom(false);
        this.isLoading = atom(false);
        this.refreshIcon = atom("rotate-right");
        this.viewIcon = atom("globe");
        this.viewName = atom("Web");
        this.urlInputRef = React.createRef<HTMLInputElement>();
        this.webviewRef = React.createRef<WebviewTag>();

        this.mediaPlaying = atom(false);
        this.mediaMuted = atom(false);

        this.viewText = atom((get) => {
            const homepageUrl = get(this.homepageUrl);
            const metaUrl = get(this.blockAtom)?.meta?.url;
            const currUrl = get(this.url);
            const urlWrapperClassName = get(this.urlWrapperClassName);
            const refreshIcon = get(this.refreshIcon);
            const mediaPlaying = get(this.mediaPlaying);
            const mediaMuted = get(this.mediaMuted);
            const url = currUrl ?? metaUrl ?? homepageUrl;
            return [
                {
                    elemtype: "iconbutton",
                    icon: "chevron-left",
                    click: this.handleBack.bind(this),
                    disabled: this.shouldDisableBackButton(),
                },
                {
                    elemtype: "iconbutton",
                    icon: "chevron-right",
                    click: this.handleForward.bind(this),
                    disabled: this.shouldDisableForwardButton(),
                },
                {
                    elemtype: "iconbutton",
                    icon: "house",
                    click: this.handleHome.bind(this),
                    disabled: this.shouldDisableHomeButton(),
                },
                {
                    elemtype: "div",
                    className: clsx("block-frame-div-url", urlWrapperClassName),
                    onMouseOver: this.handleUrlWrapperMouseOver.bind(this),
                    onMouseOut: this.handleUrlWrapperMouseOut.bind(this),
                    children: [
                        {
                            elemtype: "input",
                            value: url,
                            ref: this.urlInputRef,
                            className: "url-input",
                            onChange: this.handleUrlChange.bind(this),
                            onKeyDown: this.handleKeyDown.bind(this),
                            onFocus: this.handleFocus.bind(this),
                            onBlur: this.handleBlur.bind(this),
                        },
                        mediaPlaying && {
                            elemtype: "iconbutton",
                            icon: mediaMuted ? "volume-slash" : "volume",
                            click: this.handleMuteChange.bind(this),
                        },
                        {
                            elemtype: "iconbutton",
                            icon: refreshIcon,
                            click: this.handleRefresh.bind(this),
                        },
                    ].filter((v) => v),
                },
            ] as HeaderElem[];
        });

        this.endIconButtons = atom((get) => {
            const url = get(this.url);
            return [
                {
                    elemtype: "iconbutton",
                    icon: "arrow-up-right-from-square",
                    title: "Open in External Browser",
                    click: () => {
                        if (url != null && url != "") {
                            return getApi().openExternal(url);
                        }
                    },
                },
            ];
        });
    }

    /**
     * Whether the back button in the header should be disabled.
     * @returns True if the WebView cannot go back or if the WebView call fails. False otherwise.
     */
    shouldDisableBackButton() {
        try {
            return !this.webviewRef.current?.canGoBack();
        } catch (_) {}
        return true;
    }

    /**
     * Whether the forward button in the header should be disabled.
     * @returns True if the WebView cannot go forward or if the WebView call fails. False otherwise.
     */
    shouldDisableForwardButton() {
        try {
            return !this.webviewRef.current?.canGoForward();
        } catch (_) {}
        return true;
    }

    /**
     * Whether the home button in the header should be disabled.
     * @returns True if the current url is the pinned url or the pinned url is not set. False otherwise.
     */
    shouldDisableHomeButton() {
        try {
            const homepageUrl = globalStore.get(this.homepageUrl);
            return !homepageUrl || this.getUrl() === homepageUrl;
        } catch (_) {}
        return true;
    }

    handleHome(e?: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.loadUrl(globalStore.get(this.homepageUrl), "home");
    }

    setMediaPlaying(isPlaying: boolean) {
        console.log("setMediaPlaying", isPlaying);
        globalStore.set(this.mediaPlaying, isPlaying);
    }

    handleMuteChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try {
            const newMutedVal = !this.webviewRef.current?.isAudioMuted();
            globalStore.set(this.mediaMuted, newMutedVal);
            this.webviewRef.current?.setAudioMuted(newMutedVal);
        } catch (e) {
            console.error("Failed to change mute value", e);
        }
    }

    handleUrlWrapperMouseOver(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const urlInputFocused = globalStore.get(this.urlInputFocused);
        if (e.type === "mouseover" && !urlInputFocused) {
            globalStore.set(this.urlWrapperClassName, "hovered");
        }
    }

    handleUrlWrapperMouseOut(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const urlInputFocused = globalStore.get(this.urlInputFocused);
        if (e.type === "mouseout" && !urlInputFocused) {
            globalStore.set(this.urlWrapperClassName, "");
        }
    }

    handleBack(e?: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.webviewRef.current?.goBack();
    }

    handleForward(e?: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.webviewRef.current?.goForward();
    }

    handleRefresh(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.preventDefault();
        e.stopPropagation();
        try {
            if (this.webviewRef.current) {
                if (globalStore.get(this.isLoading)) {
                    this.webviewRef.current.stop();
                } else {
                    this.webviewRef.current.reload();
                }
            }
        } catch (e) {
            console.warn("handleRefresh catch", e);
        }
    }

    handleUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
        globalStore.set(this.url, event.target.value);
    }

    handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        const waveEvent = adaptFromReactOrNativeKeyEvent(event);
        if (checkKeyPressed(waveEvent, "Enter")) {
            const url = globalStore.get(this.url);
            this.loadUrl(url, "enter");
            this.urlInputRef.current?.blur();
            return;
        }
        if (checkKeyPressed(waveEvent, "Escape")) {
            this.webviewRef.current?.focus();
        }
    }

    handleFocus(event: React.FocusEvent<HTMLInputElement>) {
        globalStore.set(this.urlWrapperClassName, "focused");
        globalStore.set(this.urlInputFocused, true);
        this.urlInputRef.current.focus();
        event.target.select();
    }

    handleBlur(event: React.FocusEvent<HTMLInputElement>) {
        globalStore.set(this.urlWrapperClassName, "");
        globalStore.set(this.urlInputFocused, false);
    }

    /**
     * Update the URL in the state when a navigation event has occurred.
     * @param url The URL that has been navigated to.
     */
    handleNavigate(url: string) {
        ObjectService.UpdateObjectMeta(WOS.makeORef("block", this.blockId), { url });
        globalStore.set(this.url, url);
    }

    ensureUrlScheme(url: string, searchTemplate: string) {
        if (url == null) {
            url = "";
        }

        if (/^(http|https):/.test(url)) {
            // If the URL starts with http: or https:, return it as is
            return url;
        }

        // Check if the URL looks like a local URL
        const isLocal = /^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(url.split("/")[0]);

        if (isLocal) {
            // If it is a local URL, ensure it has http:// scheme
            return `http://${url}`;
        }

        // Check if the URL looks like a domain
        const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
        const isDomain = domainRegex.test(url.split("/")[0]);

        if (isDomain) {
            // If it looks like a domain, ensure it has https:// scheme
            return `https://${url}`;
        }

        // Otherwise, treat it as a search query
        if (searchTemplate == null) {
            return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
        return searchTemplate.replace("{query}", encodeURIComponent(url));
    }

    /**
     * Load a new URL in the webview.
     * @param newUrl The new URL to load in the webview.
     */
    loadUrl(newUrl: string, reason: string) {
        const defaultSearchAtom = getSettingsKeyAtom("web:defaultsearch");
        const searchTemplate = globalStore.get(defaultSearchAtom);
        const nextUrl = this.ensureUrlScheme(newUrl, searchTemplate);
        console.log("webview loadUrl", reason, nextUrl, "cur=", this.webviewRef?.current.getURL());
        if (newUrl != nextUrl) {
            globalStore.set(this.url, nextUrl);
        }
        if (!this.webviewRef.current) {
            return;
        }
        if (this.webviewRef.current.getURL() != nextUrl) {
            this.webviewRef.current.loadURL(nextUrl);
        }
    }

    /**
     * Get the current URL from the state.
     * @returns The URL from the state.
     */
    getUrl() {
        return globalStore.get(this.url);
    }

    setRefreshIcon(refreshIcon: string) {
        globalStore.set(this.refreshIcon, refreshIcon);
    }

    setIsLoading(isLoading: boolean) {
        globalStore.set(this.isLoading, isLoading);
    }

    async setHomepageUrl(url: string, scope: "global" | "block") {
        if (url != null && url != "") {
            switch (scope) {
                case "block":
                    await RpcApi.SetMetaCommand(WindowRpcClient, {
                        oref: WOS.makeORef("block", this.blockId),
                        meta: { pinnedurl: url },
                    });
                    break;
                case "global":
                    await RpcApi.SetMetaCommand(WindowRpcClient, {
                        oref: WOS.makeORef("block", this.blockId),
                        meta: { pinnedurl: "" },
                    });
                    await RpcApi.SetConfigCommand(WindowRpcClient, { "web:defaulturl": url });
                    break;
            }
        }
    }

    giveFocus(): boolean {
        const ctrlShiftState = globalStore.get(getSimpleControlShiftAtom());
        if (ctrlShiftState) {
            // this is really weird, we don't get keyup events from webview
            const unsubFn = globalStore.sub(getSimpleControlShiftAtom(), () => {
                const state = globalStore.get(getSimpleControlShiftAtom());
                if (!state) {
                    unsubFn();
                    const isStillFocused = globalStore.get(this.nodeModel.isFocused);
                    if (isStillFocused) {
                        this.webviewRef.current?.focus();
                    }
                }
            });
            return false;
        }
        this.webviewRef.current?.focus();
        return true;
    }

    keyDownHandler(e: WaveKeyboardEvent): boolean {
        if (checkKeyPressed(e, "Cmd:l")) {
            this.urlInputRef?.current?.focus();
            this.urlInputRef?.current?.select();
            return true;
        }
        if (checkKeyPressed(e, "Cmd:r")) {
            this.webviewRef?.current?.reload();
            return true;
        }
        if (checkKeyPressed(e, "Cmd:ArrowLeft")) {
            this.handleBack(null);
            return true;
        }
        if (checkKeyPressed(e, "Cmd:ArrowRight")) {
            this.handleForward(null);
            return true;
        }
        return false;
    }

    getSettingsMenuItems(): ContextMenuItem[] {
        return [
            {
                label: "Set Block Homepage",
                click: async () => {
                    await this.setHomepageUrl(this.getUrl(), "block");
                },
            },
            {
                label: "Set Default Homepage",
                click: async () => {
                    await this.setHomepageUrl(this.getUrl(), "global");
                },
            },
            {
                type: "separator",
            },
            {
                label: this.webviewRef.current?.isDevToolsOpened() ? "Close DevTools" : "Open DevTools",
                click: async () => {
                    if (this.webviewRef.current) {
                        if (this.webviewRef.current.isDevToolsOpened()) {
                            this.webviewRef.current.closeDevTools();
                        } else {
                            this.webviewRef.current.openDevTools();
                        }
                    }
                },
            },
        ];
    }
}

function makeWebViewModel(blockId: string, nodeModel: NodeModel): WebViewModel {
    const webviewModel = new WebViewModel(blockId, nodeModel);
    return webviewModel;
}

interface WebViewProps {
    blockId: string;
    model: WebViewModel;
    onFailLoad?: (url: string) => void;
}

const WebView = memo(({ model, onFailLoad }: WebViewProps) => {
    const blockData = useAtomValue(model.blockAtom);
    const defaultUrl = useAtomValue(model.homepageUrl);
    const defaultSearchAtom = getSettingsKeyAtom("web:defaultsearch");
    const defaultSearch = useAtomValue(defaultSearchAtom);
    let metaUrl = blockData?.meta?.url || defaultUrl;
    metaUrl = model.ensureUrlScheme(metaUrl, defaultSearch);
    const metaUrlRef = React.useRef(metaUrl);

    // The initial value of the block metadata URL when the component first renders. Used to set the starting src value for the webview.
    const [metaUrlInitial] = useState(metaUrl);

    const [webContentsId, setWebContentsId] = useState(null);
    const [domReady, setDomReady] = useState(false);

    function setBgColor() {
        const webview = model.webviewRef.current;
        if (!webview) {
            return;
        }
        setTimeout(() => {
            webview
                .executeJavaScript(
                    `!!document.querySelector('meta[name="color-scheme"]') && document.querySelector('meta[name="color-scheme"]').content?.includes('dark') || false`
                )
                .then((hasDarkMode) => {
                    if (hasDarkMode) {
                        webview.style.backgroundColor = "black"; // Dark mode background
                    } else {
                        webview.style.backgroundColor = "white"; // Light mode background
                    }
                })
                .catch((e) => {
                    webview.style.backgroundColor = "black"; // Dark mode background
                    console.log("Error getting color scheme, defaulting to dark", e);
                });
        }, 100);
    }

    useEffect(() => {
        if (model.webviewRef.current && domReady) {
            const wcId = model.webviewRef.current.getWebContentsId?.();
            if (wcId) {
                setWebContentsId(wcId);
            }
        }
    }, [model.webviewRef.current, domReady]);

    // Load a new URL if the block metadata is updated.
    useEffect(() => {
        if (metaUrlRef.current != metaUrl) {
            metaUrlRef.current = metaUrl;
            model.loadUrl(metaUrl, "meta");
        }
    }, [metaUrl]);

    useEffect(() => {
        const webview = model.webviewRef.current;
        if (!webview) {
            return;
        }
        const navigateListener = (e: any) => {
            model.handleNavigate(e.url);
        };
        const newWindowHandler = (e: any) => {
            e.preventDefault();
            const newUrl = e.detail.url;
            console.log("webview new-window event:", newUrl);
            fireAndForget(() => openLink(newUrl, true));
        };
        const startLoadingHandler = () => {
            model.setRefreshIcon("xmark-large");
            model.setIsLoading(true);
            webview.style.backgroundColor = "transparent";
        };
        const stopLoadingHandler = () => {
            model.setRefreshIcon("rotate-right");
            model.setIsLoading(false);
            setBgColor();
        };
        const failLoadHandler = (e: any) => {
            if (e.errorCode === -3) {
                console.warn("Suppressed ERR_ABORTED error", e);
            } else {
                console.error(`Failed to load ${e.validatedURL}: ${e.errorDescription}`);
                if (onFailLoad) {
                    const curUrl = model.webviewRef?.current.getURL();
                    onFailLoad(curUrl);
                }
            }
        };
        const webviewFocus = () => {
            getApi().setWebviewFocus(webview.getWebContentsId());
            model.nodeModel.focusNode();
        };
        const webviewBlur = () => {
            getApi().setWebviewFocus(null);
        };
        const handleDomReady = () => {
            setDomReady(true);
            setBgColor();
        };
        const handleMediaPlaying = () => {
            model.setMediaPlaying(true);
        };
        const handleMediaPaused = () => {
            model.setMediaPlaying(false);
        };

        webview.addEventListener("did-navigate-in-page", navigateListener);
        webview.addEventListener("did-navigate", navigateListener);
        webview.addEventListener("did-start-loading", startLoadingHandler);
        webview.addEventListener("did-stop-loading", stopLoadingHandler);
        webview.addEventListener("new-window", newWindowHandler);
        webview.addEventListener("did-fail-load", failLoadHandler);
        webview.addEventListener("focus", webviewFocus);
        webview.addEventListener("blur", webviewBlur);
        webview.addEventListener("dom-ready", handleDomReady);
        webview.addEventListener("media-started-playing", handleMediaPlaying);
        webview.addEventListener("media-paused", handleMediaPaused);

        // Clean up event listeners on component unmount
        return () => {
            webview.removeEventListener("did-navigate", navigateListener);
            webview.removeEventListener("did-navigate-in-page", navigateListener);
            webview.removeEventListener("new-window", newWindowHandler);
            webview.removeEventListener("did-fail-load", failLoadHandler);
            webview.removeEventListener("did-start-loading", startLoadingHandler);
            webview.removeEventListener("did-stop-loading", stopLoadingHandler);
            webview.removeEventListener("focus", webviewFocus);
            webview.removeEventListener("blur", webviewBlur);
            webview.removeEventListener("dom-ready", handleDomReady);
            webview.removeEventListener("media-started-playing", handleMediaPlaying);
            webview.removeEventListener("media-paused", handleMediaPaused);
        };
    }, []);

    return (
        <webview
            id="webview"
            className="webview"
            ref={model.webviewRef}
            src={metaUrlInitial}
            data-blockid={model.blockId}
            data-webcontentsid={webContentsId} // needed for emain
            preload={getWebviewPreloadUrl()}
            // @ts-ignore This is a discrepancy between the React typing and the Chromium impl for webviewTag. Chrome webviewTag expects a string, while React expects a boolean.
            allowpopups="true"
        ></webview>
    );
});

export { WebView, makeWebViewModel };
