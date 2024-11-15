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
    "disabled",
    "subway"
]

const videos = {
    "minecraft": "https://github.com/JustTemmie/gen-Z-friendly-wikipedia/video-files/minecraft.mp4",
    "subway": "https://github.com/JustTemmie/gen-Z-friendly-wikipedia/video-files/subway.mp4",
    "csgo": "https://skibidi.cloud/s/gQYqYkpQ8L3sCwS/download/csgo.mp4",
}

console.log("injecting brainrot...")

enabled_videos.forEach(function(video_ID, index) {
    if (videos[video_ID] != undefined) {
        setupVideo(["left", "right"][index], video_ID, true)
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

        console.log(checkIfNullOrReady(video_player_left), checkIfNullOrReady(video_player_right))
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

    console.log("waiting for content to load before resizing article...")

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
    const cachedBlob = await getCachedVideo(db, video_ID);

    if (cachedBlob) {
        console.log(`cached video exists for ${video_ID}`);
        injectVideoPlayer(position, URL.createObjectURL(cachedBlob), audio_enabled);
        await moveArticle()
    } else {
        console.log(`fetching and caching video ${video_ID} video`);
        try {
            const response = await fetch(video_URL);
            console.log(`got URL response for ${video_ID}, downloading *BLOB*`)
            const blob = await response.blob();
            console.log(`i got a blob for ${video_ID} :3`)
            cacheVideo(db, video_ID, blob);
            console.log(`the ${video_ID} video has successfully been cached!`)
            injectVideoPlayer(position, URL.createObjectURL(blob), audio_enabled);
        } catch {
            console.log(`failed to cache the ${video_ID} video, deciding to stream it instead...`)
            injectVideoPlayer(position, video_URL, audio_enabled);
        }
        
        await moveArticle()
    }
}

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("VideoCacheDB", 1);

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

async function cacheVideo(db, id, blob) {
    const transaction = db.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");
    store.put({ id: id, blob: blob });
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

const debouncedArticleMover = debounce(moveArticle, 100);

window.addEventListener('resize', debouncedArticleMover);

