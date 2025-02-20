graph TD
    subgraph Main_Process[Main Process - main.js]
        A[Electron App] -->|Creates| MW[Main Window]
        A -->|Creates| SW[Settings Window]
        A -->|Creates| TW[Typing App Window]
        A -->|Manages| T[Tray]
        A -->|Registers| GS[Global Shortcut]
        A -->|IPC| IPC_Main[ipcMain]
        A -->|Uses| WS[windowState.js]
        A -->|Uses| TYP[typing.js]
        A -->|Uses| ES[electron-store]
    end

    subgraph Renderer_Main[Renderer - Main Window]
        R[renderer.js] -->|Loads| UI[ui.js]
        R -->|Controls| REC[recording.js]
        R -->|IPC| IPC_Renderer_Main[ipcRenderer]
        REC -->|Uses| TRANS[translation.js]
        REC -->|Uses| DEV[devices.js]
        REC -->|Uses| SB[storeBridge.js]
        REC -->|WebSocket| DG[Deepgram API]
        TRANS -->|HTTP| AI["AI Providers (OpenAI, Gemini, etc.)"]
    end

    subgraph Renderer_Settings[Renderer - Settings Window]
        S[mainSettings.js] -->|Loads| PS[providerSettings.js]
        S -->|Loads| TAS[typingApp.js]
        S -->|Loads| UIS[uiSettings.js]
        S -->|Uses| SB_Settings[storeBridge.js]
        S -->|IPC| IPC_Renderer_Settings[ipcRenderer]
    end

    subgraph Renderer_Typing[Renderer - Typing App Window]
        TA[typing-app.js] -->|IPC| IPC_Renderer_Typing[ipcRenderer]
    end

    MW -->|Loads| Renderer_Main
    SW -->|Loads| Renderer_Settings
    TW -->|Loads| Renderer_Typing

    IPC_Main -->|Communicates| IPC_Renderer_Main
    IPC_Main -->|Communicates| IPC_Renderer_Settings
    IPC_Main -->|Communicates| IPC_Renderer_Typing

    ES -->|Stores| Config[Configuration Data]
    WS -->|Manages| WindowState[Window States]
    TYP -->|Simulates| Paste[Paste Operations]

    DG -->|Sends| Transcript[Real-time Transcripts]
    AI -->|Sends| Translation[Translated Text]
