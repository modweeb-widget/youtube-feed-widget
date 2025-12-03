(function() {
    // ------------------------------------------
    // المتغيرات والثوابت
    // ------------------------------------------
    // ⚠️⚠️⚠️ قم بتغيير هذا المعرّف (ID) الخاص بقناتك الثابت ⚠️⚠️⚠️
    let currentChannelId = 'UCyG546bXfZj2J4_EJMdvxqA'; // مثال: قم بوضع معرّف قناتك الحقيقي هنا
    
    const MAX_FETCH_COUNT = 20; 
    const INITIAL_DISPLAY_COUNT = 6; 
    const VIDEOS_PER_CLICK = 2; 

    let allFetchedVideos = [];
    let currentlyDisplayedCount = 0;
    
    const ytWidget = document.getElementById('youtube-widget');
    const youtubeContentContainer = document.getElementById('youtube-content'); 
    
    const modal = document.getElementById('video-modal');
    const modalPlayerContainer = document.getElementById('yt-modal-player-container');
    const closeButton = document.querySelector('.yt-modal-close');
    
    const miniPlayer = document.getElementById('yt-mini-player');
    const miniPlayerContainer = document.getElementById('yt-mini-player-iframe-container');
    
    const dragHandle = document.getElementById('yt-mini-drag-handle');
    const watchMoreBtn = document.getElementById('watch-more-btn');
    const viewChannelBtn = document.getElementById('view-channel-btn');
    const resetBtn = document.getElementById('reset-btn'); 
    const layoutSelector = document.getElementById('yt-layout-selector'); 

    let currentVideoId = null;
    let isDragging = false;
    let dragStartX, dragStartY, initialLeft, initialBottom;
    
    function updateChannelUrl(channelId) {
        const CHANNEL_URL = `https://www.youtube.com/channel/${channelId}`;
        viewChannelBtn.href = CHANNEL_URL;
    }
    updateChannelUrl(currentChannelId); 
    
    function timeAgo(dateString) {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return `قبل ${interval} سنة`;
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return `قبل ${interval} شهر`;
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return `قبل ${interval} يوم`;
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return `قبل ${interval} ساعة`;
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return `قبل ${interval} دقيقة`;
        
        return 'الآن';
    }
    
    function getVideoIdFromLink(link) {
        const match = link.match(/(?:v=|\/shorts\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    function isShortsVideo(link) {
        return link.includes('/shorts/');
    }

    // ------------------------------------------
    // منطق التحميل والشبكة
    // ------------------------------------------

    function showLoading() {
        const loadingIconSvg = `<svg class='line' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M15.24 2H8.76004C5.00004 2 4.71004 5.38 6.74004 7.22L17.26 16.78C19.29 18.62 19 22 15.24 22H8.76004C5.00004 22 4.71004 18.62 6.74004 16.78L17.26 7.22C19.29 5.38 19 2 15.24 2Z'></path></svg>`;
        
        youtubeContentContainer.innerHTML = `
            <div class="yt-state-message">
                <div class="yt-spinner">${loadingIconSvg}</div>
                <p>جاري التحميل...</p>
            </div>
        `;
        ytWidget.classList.add('loading');
        watchMoreBtn.classList.remove('visible'); 
        resetBtn.classList.remove('visible'); 
        layoutSelector.style.display = 'none'; 
    }

    function displayError(message) {
        const retryIconSvg = `<svg class='line' width="16" height="16" viewBox="0 0 24 24" fill='none' stroke='currentColor' stroke-width='2' style="margin-left: 5px;"><path d='M22 12C22 17.52 17.52 22 12 22C6.48 22 3.11 16.44 3.11 16.44M3.11 16.44H7.63M3.11 16.44V21.44M2 12C2 6.48 6.44 2 12 2C18.67 2 22 7.56 22 7.56M22 7.56V2.56M22 7.56H17.56'></path></svg>`;

        youtubeContentContainer.innerHTML = `
            <div class="yt-state-message yt-error-state">
                <p style="margin-bottom: 15px; font-weight: bold;">${message}</p>
                <button id="retry-btn" class="yt-button yt-button-primary" style="font-size: 12px; padding: 8px 16px;">
                    ${retryIconSvg}
                    إعادة المحاولة
                </button>
            </div>
        `;
        ytWidget.classList.remove('loading');
        watchMoreBtn.classList.remove('visible'); 
        resetBtn.classList.remove('visible'); 
        layoutSelector.style.display = 'none'; 
        
        document.getElementById('retry-btn')?.addEventListener('click', () => {
            allFetchedVideos = []; 
            currentlyDisplayedCount = 0;
            loadYouTubeVideos();
        });
    }

    function loadYouTubeVideos() {
        if (!currentChannelId || currentChannelId === 'YOUR_CHANNEL_ID_HERE') {
            displayError('خطأ: معرّف القناة غير صحيح. يرجى تعديل ملف JS ووضع معرّف قناتك.');
            return;
        }
        
        showLoading();
        
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${currentChannelId}`;
        const corsProxy = 'https://api.allorigins.win/get?url=';
        const proxyUrl = corsProxy + encodeURIComponent(rssUrl);
        
        fetch(proxyUrl)
            .then(response => response.json())
            .then(data => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
                const entries = xmlDoc.getElementsByTagName('entry');
                
                allFetchedVideos = []; 
                for (let i = 0; i < Math.min(entries.length, MAX_FETCH_COUNT); i++) {
                    const entry = entries[i];
                    const title = entry.getElementsByTagName('title')[0]?.textContent || 'بدون عنوان';
                    const link = entry.getElementsByTagName('link')[0]?.getAttribute('href') || '';
                    const published = entry.getElementsByTagName('published')[0]?.textContent || '';
                    const videoId = getVideoIdFromLink(link);
                    const isShort = isShortsVideo(link);
                    
                    const thumbnail = isShort 
                        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                        : `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                    
                    if (videoId) { 
                         allFetchedVideos.push({
                            title: title,
                            videoId: videoId,
                            link: link,
                            published: published,
                            thumbnail: thumbnail,
                            isShort: isShort
                        });
                    }
                }
                
                currentlyDisplayedCount = Math.min(INITIAL_DISPLAY_COUNT, allFetchedVideos.length);
                displayVideos(allFetchedVideos.slice(0, currentlyDisplayedCount));
                
                ytWidget.classList.remove('loading');
                
                checkButtonVisibility();
                layoutSelector.style.display = 'flex'; 
            })
            .catch(error => {
                console.error('خطأ في تحميل الفيديوهات:', error);
                displayError('عذراً، حدث خطأ في تحميل الفيديوهات. يرجى التأكد من معرف القناة (الثابت في JS) أو المحاولة لاحقاً. (تأكد من عمل البروكسي)');
            });
    }

    function displayVideos(videos) {
        const container = youtubeContentContainer;
        if (videos.length === 0) {
            displayError('لم يتم العثور على فيديوهات في القناة.');
            return;
        }
        
        let html = '<div class="yt-videos-grid">';
        videos.forEach(video => {
            const shortClass = video.isShort ? ' is-short' : ''; 
            const isInitial = currentlyDisplayedCount >= allFetchedVideos.length || allFetchedVideos.indexOf(video) < INITIAL_DISPLAY_COUNT;
            const hiddenClass = isInitial ? '' : ' hidden';
            
            html += `
                <div class="yt-video-card${shortClass}${hiddenClass}" data-video-id="${video.videoId}" data-link="${video.link}">
                    <div class="yt-thumbnail-wrapper">
                        <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" class="yt-thumbnail">
                    </div>
                    <div class="yt-video-info">
                        <p class="yt-video-title">${video.title}</p>
                        <span class="yt-video-date">${timeAgo(video.published)}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        ytWidget.classList.remove('loading'); 

        document.querySelectorAll('.yt-video-card').forEach(card => {
            const videoId = card.getAttribute('data-video-id');
            const link = card.getAttribute('data-link');
            if (videoId) {
                setupLazyLoad(card, videoId, link);
            }
        });
    }
    
    function appendVideos(count) {
        const nextIndex = currentlyDisplayedCount + count;
        const videosToAppend = allFetchedVideos.slice(currentlyDisplayedCount, nextIndex);
        
        if (videosToAppend.length === 0) return;

        let newCardsHTML = '';
        videosToAppend.forEach(video => {
            const shortClass = video.isShort ? ' is-short' : ''; 
            newCardsHTML += `
                <div class="yt-video-card${shortClass}" data-video-id="${video.videoId}" data-link="${video.link}">
                    <div class="yt-thumbnail-wrapper">
                        <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" class="yt-thumbnail">
                    </div>
                    <div class="yt-video-info">
                        <p class="yt-video-title">${video.title}</p>
                        <span class="yt-video-date">${timeAgo(video.published)}</span>
                    </div>
                </div>
            `;
        });
        
        const grid = youtubeContentContainer.querySelector('.yt-videos-grid');
        if (grid) {
             grid.insertAdjacentHTML('beforeend', newCardsHTML);
        }
        
        currentlyDisplayedCount += videosToAppend.length;
        checkButtonVisibility();
        
        const newCards = grid.querySelectorAll(`.yt-video-card:nth-last-child(-n+${videosToAppend.length})`);
        newCards.forEach(card => {
            const videoId = card.getAttribute('data-video-id');
            const link = card.getAttribute('data-link');
            setupLazyLoad(card, videoId, link);
        });
    }

    function resetVideos() {
        const hiddenCards = youtubeContentContainer.querySelectorAll('.yt-video-card:nth-child(n+'+ (INITIAL_DISPLAY_COUNT + 1) +')');
        hiddenCards.forEach(card => card.remove());
        
        currentlyDisplayedCount = INITIAL_DISPLAY_COUNT;
        checkButtonVisibility();
    }

    // ------------------------------------------
    // منطق زر 'مشاهدة المزيد' و 'إعادة التعيين'
    // ------------------------------------------

    function checkButtonVisibility() {
        // التحكم بزر إعادة التعيين (يعرض فقط إذا كان هناك فيديوهات إضافية معروضة)
        if (currentlyDisplayedCount > INITIAL_DISPLAY_COUNT) {
            resetBtn.classList.add('visible');
        } else {
            resetBtn.classList.remove('visible');
        }
        
        // التحكم بزر مشاهدة المزيد
        if (currentlyDisplayedCount >= allFetchedVideos.length || allFetchedVideos.length === 0) {
            watchMoreBtn.classList.remove('visible');
        } else {
            watchMoreBtn.classList.add('visible');
        }
    }
    
    watchMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        appendVideos(VIDEOS_PER_CLICK);
    });

    resetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        resetVideos();
    });
    
    // ------------------------------------------
    // منطق محدد التخطيط
    // ------------------------------------------
    
    layoutSelector.addEventListener('click', function(e) {
        const button = e.target.closest('.yt-layout-btn');
        if (!button) return;
        
        layoutSelector.querySelectorAll('.yt-layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        button.classList.add('active');
        
        const layoutClass = button.getAttribute('data-layout');
        
        youtubeContentContainer.classList.remove('layout-list', 'layout-two-cols', 'layout-three-cols');
        if (layoutClass !== 'default') {
            youtubeContentContainer.classList.add(layoutClass);
        }
    });

    // ------------------------------------------
    // منطق المشغل (بدون تغيير)
    // ------------------------------------------
    
    function createIframe(videoId, isMini = false, isShort = false) { 
        const embedUrl = isShort 
            ? `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&autoplay=1&mute=1&loop=1&playlist=${videoId}`
            : `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&autoplay=1&mute=1`;
            
        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', embedUrl);
        iframe.setAttribute('title', 'YouTube video player');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('referrerPolicy', 'strict-origin-when-cross-origin');
        iframe.setAttribute('allowFullscreen', 'true');
        iframe.setAttribute('frameborder', '0');
        return iframe;
    }

    function minimizePlayer() {
        if (!currentVideoId) return;

        modal.style.display = 'none';
        modalPlayerContainer.innerHTML = ''; 
        miniPlayerContainer.innerHTML = '';
        
        const isShort = modalPlayerContainer.classList.contains('is-short');
        
        const iframe = createIframe(currentVideoId, true, isShort);
        
        miniPlayerContainer.appendChild(iframe);
        miniPlayer.classList.add('active');
        
        if (!miniPlayer.style.left && !miniPlayer.style.bottom) {
             miniPlayer.style.left = '20px';
             miniPlayer.style.bottom = '20px';
        }
        
        miniPlayer.classList.remove('is-dragging');
    }
    
    function stopMiniPlayer() { 
        miniPlayer.classList.remove('active');
        miniPlayerContainer.innerHTML = '';
        currentVideoId = null;
    }
    
    function loadPlayer(videoId, link) { 
        stopMiniPlayer(); 
        
        currentVideoId = videoId;
        const isShort = isShortsVideo(link);

        modal.style.display = 'block';

        modalPlayerContainer.innerHTML = '';
        if (isShort) {
            modalPlayerContainer.style.setProperty('--ratio', '9 / 16');
            modalPlayerContainer.classList.add('is-short');
        } else {
            modalPlayerContainer.style.setProperty('--ratio', '16 / 9');
            modalPlayerContainer.classList.remove('is-short');
        }
        
        const iframe = createIframe(videoId, false, isShort);
        
        modalPlayerContainer.appendChild(iframe);
    }
    
    function setupLazyLoad(cardElement, videoId, link) { 
        cardElement.addEventListener('click', (e) => {
            e.preventDefault(); 
            loadPlayer(videoId, link);
        });
        
        const wrapperContainer = cardElement.querySelector('.yt-thumbnail-wrapper');
        if (wrapperContainer && !wrapperContainer.querySelector('.yt-play-icon')) {
            const playIconDiv = document.createElement('div');
            playIconDiv.className = 'yt-play-icon'; 
            playIconDiv.setAttribute('title', 'Play');
            playIconDiv.innerHTML = `<svg class='line' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 11.9999V8.43989C4 4.01989 7.13 2.2099 10.96 4.4199L14.05 6.1999L17.14 7.9799C20.97 10.1899 20.97 13.8099 17.14 16.0199L14.05 17.7999L10.96 19.5799C7.13 21.7899 4 19.9799 4 15.5599V11.9999Z' stroke-miterlimit='10'></path></svg>`;
            wrapperContainer.appendChild(playIconDiv);
        }
    }
    
    const zoomOutButton = document.getElementById('yt-mini-zoom-out');
    const zoomInButton = document.getElementById('yt-mini-zoom-in');
    const miniCloseButton = document.getElementById('yt-mini-close-btn');

    // منطق السحب (Drag logic) (بدون تغيير)
    dragHandle.addEventListener('mousedown', dragStart);
    dragHandle.addEventListener('touchstart', dragStart);
    
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchend', dragEnd);
    document.addEventListener('touchmove', drag);
    

    function dragStart(e) { 
        isDragging = true;
        e.preventDefault(); 
        miniPlayer.classList.add('is-dragging'); 

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        dragStartX = clientX;
        dragStartY = clientY;
        
        const currentLeft = parseFloat(miniPlayer.style.left) || 0;
        const currentBottom = parseFloat(miniPlayer.style.bottom) || 0;
        
        initialLeft = currentLeft;
        initialBottom = currentBottom;
        
        miniPlayer.style.transition = 'none';
    }

    function dragEnd() { 
        if (!isDragging) return;
        isDragging = false;
        miniPlayer.classList.remove('is-dragging'); 
        miniPlayer.style.transition = 'all 0.4s ease';
    }

    function drag(e) { 
        if (!isDragging) return;
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        const dx = clientX - dragStartX;
        const dy = clientY - dragStartY;
        
        let newLeft = initialLeft + dx;
        let newBottom = initialBottom - dy; 
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const playerWidth = miniPlayer.offsetWidth;
        const playerHeight = miniPlayer.offsetHeight;
        
        if (newLeft < 0) newLeft = 0;
        if (newLeft > windowWidth - playerWidth) newLeft = windowWidth - playerWidth;
        
        if (newBottom < 0) newBottom = 0;
        if (newBottom > windowHeight - playerHeight) newBottom = windowHeight - playerHeight;
        
        miniPlayer.style.left = `${newLeft}px`;
        miniPlayer.style.bottom = `${newBottom}px`;
    }
    
    zoomOutButton.onclick = () => {
        miniPlayer.classList.add('small-size');
        zoomOutButton.style.display = 'none';
        zoomInButton.style.display = 'block';
    };

    zoomInButton.onclick = () => {
        miniPlayer.classList.remove('small-size');
        zoomInButton.style.display = 'none';
        zoomOutButton.style.display = 'block';
    };
    
    zoomInButton.style.display = 'none';

    closeButton.onclick = minimizePlayer;
    miniCloseButton.onclick = stopMiniPlayer;

    window.onclick = function(event) {
        if (event.target == modal) {
            minimizePlayer();
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadYouTubeVideos);
    } else {
        loadYouTubeVideos();
    }
})();
