// Copyright 2024, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

// generated by cmd/generate/main-generate.go

import * as WOS from "./wos";

// blockservice.BlockService (block)
class BlockServiceType {
    GetControllerStatus(arg2: string): Promise<BlockControllerRuntimeStatus> {
        return WOS.callBackendService("block", "GetControllerStatus", Array.from(arguments))
    }
    SaveTerminalState(arg2: string, arg3: string, arg4: string, arg5: number): Promise<void> {
        return WOS.callBackendService("block", "SaveTerminalState", Array.from(arguments))
    }
}

export const BlockService = new BlockServiceType();

// clientservice.ClientService (client)
class ClientServiceType {
    FocusWindow(arg2: string): Promise<void> {
        return WOS.callBackendService("client", "FocusWindow", Array.from(arguments))
    }
    GetClientData(): Promise<Client> {
        return WOS.callBackendService("client", "GetClientData", Array.from(arguments))
    }
    GetTab(arg1: string): Promise<Tab> {
        return WOS.callBackendService("client", "GetTab", Array.from(arguments))
    }
    GetWindow(arg1: string): Promise<WaveWindow> {
        return WOS.callBackendService("client", "GetWindow", Array.from(arguments))
    }
    GetWorkspace(arg1: string): Promise<Workspace> {
        return WOS.callBackendService("client", "GetWorkspace", Array.from(arguments))
    }
    MakeWindow(): Promise<WaveWindow> {
        return WOS.callBackendService("client", "MakeWindow", Array.from(arguments))
    }
}

export const ClientService = new ClientServiceType();

// fileservice.FileService (file)
class FileServiceType {
    AddWidget(arg1: WidgetsConfigType): Promise<void> {
        return WOS.callBackendService("file", "AddWidget", Array.from(arguments))
    }
    DeleteFile(arg1: string): Promise<void> {
        return WOS.callBackendService("file", "DeleteFile", Array.from(arguments))
    }
    GetSettingsConfig(): Promise<any> {
        return WOS.callBackendService("file", "GetSettingsConfig", Array.from(arguments))
    }
    GetWaveFile(arg1: string, arg2: string): Promise<any> {
        return WOS.callBackendService("file", "GetWaveFile", Array.from(arguments))
    }
    ReadFile(arg1: string): Promise<FullFile> {
        return WOS.callBackendService("file", "ReadFile", Array.from(arguments))
    }
    RemoveWidget(arg1: number): Promise<void> {
        return WOS.callBackendService("file", "RemoveWidget", Array.from(arguments))
    }
    SaveFile(arg1: string, arg2: string): Promise<void> {
        return WOS.callBackendService("file", "SaveFile", Array.from(arguments))
    }
    StatFile(arg1: string): Promise<FileInfo> {
        return WOS.callBackendService("file", "StatFile", Array.from(arguments))
    }
}

export const FileService = new FileServiceType();

// objectservice.ObjectService (object)
class ObjectServiceType {
    // @returns tabId (and object updates)
    AddTabToWorkspace(tabName: string, activateTab: boolean): Promise<string> {
        return WOS.callBackendService("object", "AddTabToWorkspace", Array.from(arguments))
    }

    // @returns blockId (and object updates)
    CreateBlock(blockDef: BlockDef, rtOpts: RuntimeOpts): Promise<string> {
        return WOS.callBackendService("object", "CreateBlock", Array.from(arguments))
    }

    // @returns object updates
    DeleteBlock(blockId: string): Promise<void> {
        return WOS.callBackendService("object", "DeleteBlock", Array.from(arguments))
    }

    // get wave object by oref
    GetObject(oref: string): Promise<WaveObj> {
        return WOS.callBackendService("object", "GetObject", Array.from(arguments))
    }

    // @returns objects
    GetObjects(orefs: string[]): Promise<WaveObj[]> {
        return WOS.callBackendService("object", "GetObjects", Array.from(arguments))
    }

    // @returns object updates
    SetActiveTab(tabId: string): Promise<void> {
        return WOS.callBackendService("object", "SetActiveTab", Array.from(arguments))
    }

    // @returns object updates
    UpdateObject(waveObj: WaveObj, returnUpdates: boolean): Promise<void> {
        return WOS.callBackendService("object", "UpdateObject", Array.from(arguments))
    }

    // @returns object updates
    UpdateObjectMeta(oref: string, meta: MetaType): Promise<void> {
        return WOS.callBackendService("object", "UpdateObjectMeta", Array.from(arguments))
    }

    // @returns object updates
    UpdateTabName(tabId: string, name: string): Promise<void> {
        return WOS.callBackendService("object", "UpdateTabName", Array.from(arguments))
    }

    // @returns object updates
    UpdateWorkspaceTabIds(workspaceId: string, tabIds: string[]): Promise<void> {
        return WOS.callBackendService("object", "UpdateWorkspaceTabIds", Array.from(arguments))
    }
}

export const ObjectService = new ObjectServiceType();

// userinputservice.UserInputService (userinput)
class UserInputServiceType {
    SendUserInputResponse(arg1: UserInputResponse): Promise<void> {
        return WOS.callBackendService("userinput", "SendUserInputResponse", Array.from(arguments))
    }
}

export const UserInputService = new UserInputServiceType();

// windowservice.WindowService (window)
class WindowServiceType {
    // @returns object updates
    CloseTab(arg3: string): Promise<void> {
        return WOS.callBackendService("window", "CloseTab", Array.from(arguments))
    }
    CloseWindow(arg2: string): Promise<void> {
        return WOS.callBackendService("window", "CloseWindow", Array.from(arguments))
    }

    // move block to new window
    // @returns object updates
    MoveBlockToNewWindow(currentTabId: string, blockId: string): Promise<void> {
        return WOS.callBackendService("window", "MoveBlockToNewWindow", Array.from(arguments))
    }

    // @returns object updates
    SetWindowPosAndSize(arg2: string, arg3: Point, arg4: WinSize): Promise<void> {
        return WOS.callBackendService("window", "SetWindowPosAndSize", Array.from(arguments))
    }
}

export const WindowService = new WindowServiceType();

