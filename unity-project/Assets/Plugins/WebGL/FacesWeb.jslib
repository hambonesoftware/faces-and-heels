mergeInto(LibraryManager.library, {
    FacesWeb_PixelScale: function () {
        var canvas = Module.canvas;
        return canvas && canvas.clientWidth ? canvas.width / canvas.clientWidth : 1;
    },
    FacesWeb_Announce: function (message) {
        var status = document.getElementById("faces-announcement");
        if (status) status.textContent = UTF8ToString(message);
    },
    FacesWeb_ToggleFullscreen: function () {
        var container = document.getElementById("unity-container");
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
        else if (container && container.requestFullscreen) container.requestFullscreen().catch(function () {});
    },
    FacesWeb_Connect: function () {
        var state = { reply: null, clip: null, worker: null };
        Module.facesBridge = state;
        try {
            var url = new URL("StreamingAssets/FacesRules/browser-bridge.mjs", document.baseURI);
            state.worker = new Worker(url, {type: "module"});
            state.worker.onmessage = function (event) {
                state.reply = event.data.reply;
                state.clip = event.data.clip || null;
            };
            state.worker.onerror = function (event) {
                state.reply = JSON.stringify({error: event.message || "The browser match engine could not start."});
                state.clip = null;
            };
        } catch (error) {
            state.reply = JSON.stringify({error: error.message});
        }
    },
    FacesWeb_Send: function (json) {
        var state = Module.facesBridge;
        if (state && state.worker) state.worker.postMessage(UTF8ToString(json));
    },
    FacesWeb_Receive: function () {
        var state = Module.facesBridge;
        if (!state || !state.reply) return 0;
        var size = lengthBytesUTF8(state.reply) + 1;
        var pointer = _malloc(size);
        stringToUTF8(state.reply, pointer, size);
        state.reply = null;
        return pointer;
    },
    FacesWeb_ClipSize: function () {
        var state = Module.facesBridge;
        return state && state.clip ? state.clip.byteLength : 0;
    },
    FacesWeb_TakeClip: function () {
        var state = Module.facesBridge;
        if (!state || !state.clip) return 0;
        var pointer = _malloc(state.clip.byteLength);
        HEAPU8.set(state.clip, pointer);
        state.clip = null;
        return pointer;
    },
    FacesWeb_Free: function (pointer) {
        _free(pointer);
    },
    FacesWeb_Disconnect: function () {
        var state = Module.facesBridge;
        if (state && state.worker) state.worker.terminate();
        Module.facesBridge = null;
    }
});
