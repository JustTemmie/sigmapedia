const enabled_videos = [
    "subway",
    "minecraft_parkour"
]

const videos = {
    "minecraft_parkour": [
        "https://files.catbox.moe/wnayaw.mp4",
        "https://files.catbox.moe/ayvfnd.mp4",
        "https://files.catbox.moe/tqcp2u.mp4"
    ],
    "subway": [
        "https://files.catbox.moe/hu9qz8.mp4",
        "https://files.catbox.moe/xduow5.mp4",
        "https://files.catbox.moe/q85tcc.mp4"
    ],
    "parkour_civilization": [
        "https://files.catbox.moe/i511z6.mp4",
        "https://files.catbox.moe/7okyku.mp4",
    ],
    "mobile_game_ads": [
        "https://files.catbox.moe/easj40.mp4",
        "https://files.catbox.moe/nvvg22.mp4"
    ]
}

main()

function main() {
    console.log("injecting brainrot...")
    
    document.body.style.fontWeight = "bold"

    enabled_videos.forEach(function(video_ID, index) {
        if (videos[video_ID] != undefined) {
            setupVideo(["left", "right"][index], video_ID, false)
        }
    });
    
    if (!window.location.href.includes("Main_Page")) {
        (async () => {injectTTSAudio()})()
    }
}

async function generateTTSAudio(text) {
    return await fetch("https://tiktok-tts.weilbyte.dev/api/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "text": text,
            "voice": "en_us_001"
        }),
    });
}

async function injectTTSAudio() {
    function getTextBetweenHeaders(first_header, second_header) {
        let text_nodes = []

        let current_node = first_header
        while (current_node != undefined && current_node != second_header) {
            if (current_node.nodeName === "P" || current_node.nodeName === "UL") {
                // be sure to remove the citations
                text_nodes.push(current_node.textContent.replace(/\[\d+\]/g, ""))
            }

            current_node = current_node.nextSibling
        }

        return text_nodes.join(".")
    }

    const headers = document.querySelectorAll("h2")

    for (let loop_index = 0; loop_index < headers.length; loop_index ++) {
        const current_header = headers[loop_index]
        const next_header = headers[loop_index + 1]

        if (current_header.innerText == "References" || current_header.innerText == "External links") {
            break
        }
        
        let audio = document.createElement("audio")
        audio.setAttribute("controls", "")
        
        current_header.insertAdjacentElement("beforeend", document.createElement("br"))
        current_header.insertAdjacentElement("beforeend", audio)
        
        audio.addEventListener("play", async () => {
            if (audio.source == undefined) {
                
                const text = getTextBetweenHeaders(current_header.parentNode, next_header.parentNode)
                const text_segments = []
                // due to the TTS API only being able to generate ~6 minutes of audio we split the text into 4000 character chunks
                for (let text_index = 0; text_index < text.length; text_index += 4000) {
                    text_segments.push(text.slice(text_index, text_index+4000))
                }
                
                for (let chunk_index = 0; chunk_index < text_segments.length; chunk_index++) {
                    // generate a new audio player if this isn't the first 4000 characters
                    if (chunk_index != 0) {
                        audio = document.createElement("audio")
                        audio.setAttribute("controls", "")
                        
                        current_header.insertAdjacentElement("beforeend", document.createElement("br"))
                        current_header.insertAdjacentElement("beforeend", audio)
                    }

                    const toast_ID = getRandomID()
                    createToast(toast_ID, "Generating Audio...")

                    const request = await generateTTSAudio(text_segments[chunk_index])
                    
                    if (request.status == 200) {
                        const source = document.createElement("source")
                        source.setAttribute("src", URL.createObjectURL(await request.blob()))
                        source.setAttribute("type", "audio/mpeg")
                        audio.appendChild(source)
                        audio.source = source

                        removeToast(toast_ID, 1000)
                    } else {
                        updateToast(toast_ID, `status code ${request.status} met whilst trying to generate audio`)
                        removeToast(toast_ID, 5000)
                        console.log(`${request.status} - ${request.response}`)
                    }
                }
            }
        })
    }
}
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
            article.style.cssText +=`
                margin-left: ${getPlayerWidth(video_player_left)}px !important;
                margin-right: ${getPlayerWidth(video_player_right)}px !important;
                top: 0;
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

    video.addEventListener('loadedmetadata', function() {
        video.currentTime = Math.random() * video.duration;
        moveArticle()
    });

    console.log(`${video_URL} has been injected`)
    document.body.appendChild(video)
}

async function setupVideo(position, video_ID, audio_enabled) {
    const video_category = videos[video_ID]
    const cached_videos = []
    let queued_downloads = 0


    const db = await openDB();

    for (let index = 0; index < video_category.length; index ++) {
        const video_URL = video_category[index]
        const cachedBlob = await getCachedVideo(db, video_URL);
        if (cachedBlob) {
            cached_videos.push(video_URL)
        } else {
            if (queued_downloads < 1 && !await isCacheDownloading(db, video_URL)) {
                queued_downloads++
                (async () => {
                    try {
                        console.log(`fetching and caching video ${video_URL} video`);
                        await markCacheAsDownloading(db, video_URL)
                        
                        const blob = await fetchWithProgress(video_URL)
        
                        console.log(`i got a blob for ${video_URL} :3`)
                        cacheVideo(db, video_URL, blob);
        
                        let successfully_cached_toast_ID = getRandomID()
                        createToast(successfully_cached_toast_ID, `the ${video_URL} video has successfully been cached!`)
                        removeToast(successfully_cached_toast_ID, 5000)
                        console.log(`the ${video_URL} video has successfully been cached!`) 
        
                        if (cached_videos.length == 0) {
                            cached_videos.push(video_URL)
                            injectVideoPlayer(position, URL.createObjectURL(blob), audio_enabled)
                        }
                    } catch {
                        console.log(`error encountered whilst trying to download ${video_URL}`)
                        markCacheAsNotDownloading(db, video_URL)
                    }
                })()
            }
        }
    }

    if (cached_videos.length >= 1) {
        const video_URL = cached_videos[Math.floor(Math.random() * cached_videos.length)]
        const cachedBlob = await getCachedVideo(db, video_URL);
        injectVideoPlayer(position, URL.createObjectURL(cachedBlob), audio_enabled)
    }
}

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("SigmapediaVideoDB", 1);

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
                if (Date.now() - data.timestamp < 300000) {
                    console.log(`started downloading the video ${(Date.now() - data.timestamp) / 1000} seconds ago`)
                    resolve(true)
                } else {
                    resolve(false)
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

async function fetchWithProgress(url) {
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
    createToast(progressbar_toast_ID, `downloading ${url} video...`)

    while(true) {
        const { done, value } = await reader.read();
        if (done) {
            removeToast(progressbar_toast_ID, 900)
            break;
        }

        chunks.push(value);
        bytesReceived += value.length;

        if (Date.now() - last_toast > 5000) {
            if (totalSize != 0) {
                updateToast(progressbar_toast_ID, `downloading ${url}, ${(bytesReceived / totalSize * 100).toFixed(2)}% complete (${formatBytes(bytesReceived)} / ${formatBytes(totalSize)} recieved)`)
            } else {
                updateToast(progressbar_toast_ID, `downloading ${url}, (${formatBytes(bytesReceived)} / ? bytes recieved)`)
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

function getRandomID() {
    return (Math.random() + 1).toString(36).substring(2)
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
    toast.style.opacity = 0.8
    toast.style.fontSize = "14px";
    toast.style.color = 'white';
    toast.style.padding = '14px';
    toast.style.marginTop = '14px';
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

    setTimeout(() => {fadeOut(toast)}, timeout - 800)
    setTimeout(() => {
        toastContainer.removeChild(toast);
    }, timeout);
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

