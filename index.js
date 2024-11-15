// ==UserScript==
// @name         Gen-Z Wikipedia
// @namespace    http://tampermonkey.net/
// @version      2024-11-14
// @description  ultimate brainrot
// @author       Twig
// @match        https://*.wikipedia.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikipedia.org
// @grant        none
// ==/UserScript==


const enabled_videos = [
    "minecraft",
    "small_subway"
]

const videos = {
    "minecraft": "https://github.com/JustTemmie/gen-Z-friendly-wikipedia/raw/refs/heads/master/video-files/minecraft.mp4",
    "subway": "https://github.com/JustTemmie/gen-Z-friendly-wikipedia/raw/refs/heads/master/video-files/subway.mp4",
    "discord_subway": "https://cdn.discordapp.com/attachments/1266118108154695730/1306725752699490464/3_Minute_Tiktok_Background_Gameplay_fast_w_audio_FXckmIoiIBs.mp4?ex=6737b6b1&is=67366531&hm=f7e2baa9eef33009670ff0725f22c8f59e35b89133c3b0141e0a1e38722db766&",
    "small_subway": "https://cdn.discordapp.com/attachments/919668170812440607/1306748845186613268/video.mp4?ex=6737cc32&is=67367ab2&hm=0ad58afbfa5a8d6cc733d1f404292405c97ad7466b152ae6f0d47a3d9ed3d299&88",
    "csgo": "https://skibidi.cloud/s/gQYqYkpQ8L3sCwS/download/csgo.mp4",
}

console.log("injecting brainrot...")

enabled_videos.forEach(function(video_ID, index) {
    if (videos[video_ID] != undefined) {
        setupVideo(["left", "right"][index], video_ID, false)
    }
});

async function moveArticle() {
    let article = document.getElementsByClassName("mw-page-container")[0]

    if (article != undefined) {
        function checkIfNullOrReady(player) {
            if (player === null) {
                return true
            } else if (player.readyState >= 2) {
                return true
            }
            return false
        }

        function getPlayerWidth(player) {
            if (player === null) {
                return 0
            } else {
                return player.clientWidth
            }
        }

        const video_player_left = document.getElementById("brain-rot-video-left")
        const video_player_right = document.getElementById("brain-rot-video-right")

        // console.log(checkIfNullOrReady(video_player_left), checkIfNullOrReady(video_player_right))
        if (checkIfNullOrReady(video_player_left) && checkIfNullOrReady(video_player_right)) {
            console.log("content has finished loading, resizing article!")
            article.style.cssText = `
                margin-left: ${getPlayerWidth(video_player_left)}px !important;
                margin-right: ${getPlayerWidth(video_player_right)}px !important;
                top: 0;
                position: fixed;
            `
            return
        }
    }

    // console.log("waiting for content to load before resizing article...")

    setTimeout(moveArticle, 100)
}

function injectVideoPlayer(position, video_URL, audio_enabled) {
    if (position != "left" && position != "right") {
        return
    }

    const video = document.createElement('video');

    video.style.cssText = `
        position: fixed;
        top: 0;
        width: fit-content;
        max-width: 40vw;
        height: 100vh;
    `;

    if (position == "right") {
        video.style.cssText += `
            right: 0;
        `;
    } else {
        video.style.cssText += `
            left: 0;
        `;
    }

    if (! audio_enabled) {
        video.muted = true
    }

    video.src = video_URL
    video.loop = true
    video.autoplay = true
    video.controls = false
    video.id = `brain-rot-video-${position}`
    document.body.appendChild(video)
}

async function setupVideo(position, video_ID, audio_enabled) {
    const video_URL = videos[video_ID]
    const db = await openDB();

    console.log(`is ${video_ID} downloading? - ${await isCacheDownloading(db, video_ID)}`)
    if (await isCacheDownloading(db, video_ID)) {
        let toast_ID = getRandomID()
        createToast(toast_ID, `a background tab seems to be already downloading the ${video_ID} video\nthe video will be streamed on this page in the mean-time`)
        removeToast(toast_ID, 5000)

        injectVideoPlayer(position, video_URL, audio_enabled);
        await moveArticle()

        return
    }
    
    const cachedBlob = await getCachedVideo(db, video_ID);
    if (cachedBlob) {
        console.log(`cached video exists for ${video_ID}`);
        injectVideoPlayer(position, URL.createObjectURL(cachedBlob), audio_enabled);
        await moveArticle()
    } else {
        try {
            console.log(`fetching and caching video ${video_ID} video`);
            await markCacheAsDownloading(db, video_ID)
            
            let not_in_cache_toast_ID = getRandomID()
            createToast(not_in_cache_toast_ID, `the ${video_ID} video doesn't exist in cache so we need to download it, this will likely take multiple minutes...`)
            removeToast(not_in_cache_toast_ID, 15000)

            let dont_close_toast_ID = getRandomID()
            createToast(dont_close_toast_ID, `do NOT close this tab until the video is playing, thanks`)
            removeToast(dont_close_toast_ID, 15000)

            const blob = await fetchWithProgress(video_URL, video_ID)

            console.log(`i got a blob for ${video_ID} :3`)
            cacheVideo(db, video_ID, blob);

            let successfully_cached_toast_ID = getRandomID()
            createToast(successfully_cached_toast_ID, `the ${video_ID} video has successfully been cached!`)
            removeToast(successfully_cached_toast_ID, 5000)
            console.log(`the ${video_ID} video has successfully been cached!`)

            injectVideoPlayer(position, URL.createObjectURL(blob), audio_enabled);
        } catch {
            await markCacheAsNotDownloading(db, video_ID)
            console.log(`failed to cache the ${video_ID} video, deciding to stream it instead...`)
            injectVideoPlayer(position, video_URL, audio_enabled);
        }
        
        await moveArticle()
    }
}

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("genZWikiVideoDB", 1);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            db.createObjectStore("videos", { keyPath: "id" });
        };

        request.onerror = function(event) {
            console.error("Database error: " + event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
    });
}

async function getCachedVideo(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["videos"], "readonly");
        const store = transaction.objectStore("videos");
        const request = store.get(id);

        request.onerror = function(event) {
            console.error("Error fetching video from cache: ", event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onsuccess = function(event) {
            resolve(request.result ? request.result.blob : null);
        };
    });
}

async function isCacheDownloading(db, ID) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["videos"], "readwrite")
        const store = transaction.objectStore("videos")
        const request = store.get(ID)

        request.onsuccess = () => {
            const data = request.result
            if (data && data.timestamp) {
                // if the video started downloading over 5 minutes ago it probably got interrupted
                if (Date.now() - data.timestamp > 300000) {
                    console.log(Date.now() - data.timestamp)
                    resolve(false)
                } else {
                    resolve(true)
                }
            }

            resolve(false)
        }

        request.onerror = () => {
            console.log("what")
            resolve(false)
        }
    })
}

async function markCacheAsDownloading(db, ID) {
    const transaction = db.transaction(["videos"], "readwrite")
    const store = transaction.objectStore("videos")
    store.put({id: ID, timestamp: Date.now()})
}

async function markCacheAsNotDownloading(db, ID) {
    const transaction = db.transaction(["videos"], "readwrite")
    const store = transaction.objectStore("videos")
    const request = store.get(ID)

    request.onsuccess = () => {
        const data = request.result
        if (data && data.downloader) {
            data.downloader = null
            store.put(data)
        }
    }

    await transaction.complete
}

async function cacheVideo(db, ID, blob) {
    const transaction = db.transaction(["videos"], "readwrite")
    const store = transaction.objectStore("videos")
    store.put({id: ID, blob: blob})
}

async function fetchWithProgress(url, video_ID = "?") {
    const response = await fetch(url);
    
    const contentLength = response.headers.get('Content-Length');
    let totalSize = 0
    if (!contentLength) {
        console.log("penis")
    } else {
        totalSize = parseInt(contentLength, 10);
    }

    const reader = response.body.getReader();
    let bytesReceived = 0;

    let chunks = [];
    
    let last_toast = Date.now()
    let progressbar_toast_ID = getRandomID()
    createToast(progressbar_toast_ID, `downloading ${video_ID} video...`)

    while(true) {
        const { done, value } = await reader.read();
        if (done) {
            updateToast(progressbar_toast_ID, `successfully finished downloading ${video_ID}!`)
            removeToast(progressbar_toast_ID, 3000)
            break;
        }

        chunks.push(value);
        bytesReceived += value.length;

        if (Date.now() - last_toast > 1000) {
            if (totalSize != 0) {
                updateToast(progressbar_toast_ID, `downloading ${video_ID}, ${(bytesReceived / totalSize * 100).toFixed(2)}% complete (${formatBytes(bytesReceived)} / ${formatBytes(totalSize)} recieved)`)
            } else {
                updateToast(progressbar_toast_ID, `downloading ${video_ID}, (${formatBytes(bytesReceived)} / ? bytes recieved)`)
            }

            last_toast = Date.now()
        }
    }
    


    return new Blob(chunks)
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function createToast(ID, message) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.left = '20px';
        toastContainer.style.zIndex = '1000';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.style.background = 'rgba(0, 0, 0, 1)';
    toast.style.opacity = 0.9
    toast.style.fontSize = "18px";
    toast.style.color = 'white';
    toast.style.padding = '20px';
    toast.style.marginTop = '20px';
    toast.style.borderRadius = '5px';
    toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    toast.id = ID
    toast.textContent = message;
    
    toastContainer.appendChild(toast);


}

function updateToast(ID, message) {
    let toast = document.getElementById(ID)
    toast.textContent = message
}

function removeToast(ID, timeout) {
    let toastContainer = document.getElementById('toast-container');
    let toast = document.getElementById(ID)

    function fadeOut(toast_box) {
        toast_box.style.opacity -= 0.01
        if (toast_box.style.opacity > 0) {
            setTimeout(() => {fadeOut(toast_box), 10})
        }
    }

    setTimeout(() => {fadeOut(toast)}, timeout - 900)
    setTimeout(() => {
        toastContainer.removeChild(toast);
    }, timeout);
}

function getRandomID() {
    return (Math.random() + 1).toString(36).substring(2)
}

// code fetched from https://stackoverflow.com/a/18650828
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const debouncedArticleMover = debounce(moveArticle, 100);

window.addEventListener('resize', debouncedArticleMover);

