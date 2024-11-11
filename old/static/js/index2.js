// 1. 상수 및 전역 설정
const CONFIG = {
    ZOOM: {
        DEFAULT: 1.0,
        STEP: 0.1,
        MIN: 0.1
    },
    PADDING: 20,
    CATEGORY_COLORS: {
        "table": "aqua",
        "figure": "blue",
        "chart": "brown",
        "heading1": "coral",
        "footer": "green",
        "caption": "grey",
        "paragraph": "magenta",
        "equation": "olive",
        "list": "purple",
        "index": "red",
        "footnote": "chocolate",
        "header": "darkgreen"
    }
};

// 2. 상태 관리
class AppState {
    constructor() {
        this.hasJson = false;
        this.hasPdf = false;
        this.jsonName = '';
        this.pdfName = '';
        this.currentPage = 0;
        this.jsonData = null;
        this.pdfDocument = null;
        this.jsonFile = null;
        this.pdfFile = null;
        this.matchPdfJson = false;
        this.elementManager = null;
        this.currentZoom = CONFIG.ZOOM.DEFAULT;
    }

    reset() {
        this.hasJson = false;
        this.hasPdf = false;
        this.jsonName = '';
        this.pdfName = '';
        this.jsonData = null;
        this.pdfDocument = null;
    }
}

// 3. 유틸리티 클래스들
const Utils = {
    splitext(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
    },

    getCurrentDateTime() {
        const now = new Date();
        const format = (num) => String(num).padStart(2, '0');
        
        return `${now.getFullYear()}-${format(now.getMonth() + 1)}-${format(now.getDate())} ` +
               `${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
    },

    convertToRelativeCoordinates(bbox, pageWidth, pageHeight) {
        return {
            x: (bbox.x / pageWidth).toFixed(4),
            y: (bbox.y / pageHeight).toFixed(4)
        };
    }
};

const BBoxUtils = {
    calculatePosition(bbox, viewport, padding) {
        const canvas = document.getElementById('pdfCanvas');
        const containerWidth = document.getElementById('pdfContainer').clientWidth;
        const xOffset = (containerWidth - canvas.width) / 2;
        
        return {
            x: (parseFloat(bbox[0].x) * viewport.width) + padding + xOffset,
            y: (parseFloat(bbox[0].y) * viewport.height) + padding,
            width: (parseFloat(bbox[2].x) * viewport.width) - (parseFloat(bbox[0].x) * viewport.width),
            height: (parseFloat(bbox[2].y) * viewport.height) - (parseFloat(bbox[0].y) * viewport.height)
        };
    },

    applyBboxStyle(div, x, y, width, height, category) {
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;
        div.style.borderColor = CONFIG.CATEGORY_COLORS[category] || 'red';
    },

    addAnnotation(div, element) {
        const annotation = document.createElement('div');
        annotation.className = 'bbox-annotation';
        annotation.textContent = `${element.category} (ID: ${element.id})`;
        annotation.style.backgroundColor = CONFIG.CATEGORY_COLORS[element.category];
        annotation.style.color = 'white';
        div.appendChild(annotation);
    }
};

const TableManager = {
    createEmptyTable() {
        const tbody = document.querySelector('#elementsTable tbody');
        if (tbody) tbody.innerHTML = '';
    },

    updateElementsTable(elements) {
        const tbody = document.querySelector('#elementsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        elements.forEach(element => {
            const row = this.createTableRow(element);
            tbody.appendChild(row);
        });
    },

    createTableRow(element) {
        const row = document.createElement('tr');
        row.setAttribute('data-element-id', element.id);
        
        row.innerHTML = `
            <td>${element.id}</td>
            <td>${element.category}</td>
            <td>${this.getBboxCoordinates(element.bounding_box)}</td>
        `;

        row.addEventListener('click', (e) => {
            e.stopPropagation();
            if (appState.elementManager) {
                appState.elementManager.selectElement(element, 'table');
            }
        });

        return row;
    },

    getBboxCoordinates(bbox) {
        return `(${bbox[0].x}, ${bbox[0].y}) - (${bbox[2].x}, ${bbox[2].y})`;
    }
};

const ZoomControls = {
    setup() {
        const zoomInBtn = document.getElementById('zoomInButton');
        const zoomOutBtn = document.getElementById('zoomOutButton');
        const zoomResetBtn = document.getElementById('zoomResetButton');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.zoomReset());
    },

    async zoomIn() {
        appState.currentZoom += CONFIG.ZOOM.STEP;
        await this.updateZoom();
    },

    async zoomOut() {
        const newZoom = Math.max(CONFIG.ZOOM.MIN, appState.currentZoom - CONFIG.ZOOM.STEP);
        if (newZoom !== appState.currentZoom) {
            appState.currentZoom = newZoom;
            await this.updateZoom();
        }
    },

    async zoomReset() {
        appState.currentZoom = CONFIG.ZOOM.DEFAULT;
        await this.updateZoom();
    },

    async updateZoom() {
        if (appState.pdfDocument && appState.currentPage > 0) {
            await renderPdfPage(appState.pdfDocument, appState.currentPage, appState.currentZoom);
        }
    }
};

class ElementManager {
    constructor() {
        this.selectedElement = null;
        this.isDragging = false;
        this.dragStartPos = null;
        this.originalBbox = null;
        this.viewport = null;
    }

    setViewport(viewport) {
        this.viewport = viewport;
    }

    selectElement(element, source) {
        // 이전 선택 해제
        if (this.selectedElement) {
            const prevBbox = document.getElementById(`bbox-${this.selectedElement.id}`);
            if (prevBbox) prevBbox.classList.remove('selected');
            
            const prevRow = document.querySelector(`tr[data-element-id="${this.selectedElement.id}"]`);
            if (prevRow) prevRow.classList.remove('selected');
        }

        // 새로운 요소 선택
        this.selectedElement = element;
        
        const bbox = document.getElementById(`bbox-${element.id}`);
        if (bbox) bbox.classList.add('selected');
        
        const row = document.querySelector(`tr[data-element-id="${element.id}"]`);
        if (row) row.classList.add('selected');
    }

    deselectCurrentElement() {
        if (this.selectedElement) {
            const bbox = document.getElementById(`bbox-${this.selectedElement.id}`);
            if (bbox) bbox.classList.remove('selected');
            
            const row = document.querySelector(`tr[data-element-id="${this.selectedElement.id}"]`);
            if (row) row.classList.remove('selected');
            
            this.selectedElement = null;
        }
    }

    updateBboxPosition(bbox, dx, dy) {
        if (!this.selectedElement || !this.viewport) return;

        const newLeft = bbox.offsetLeft + dx;
        const newTop = bbox.offsetTop + dy;
        
        bbox.style.left = `${newLeft}px`;
        bbox.style.top = `${newTop}px`;
        
        this.updateBoundingBoxCoordinates(newLeft, newTop, bbox.offsetWidth, bbox.offsetHeight);
    }

    updateBoundingBoxCoordinates(left, top, width, height) {
        if (!this.selectedElement || !this.viewport) return;

        const padding = CONFIG.PADDING;
        const relativeX = (left - padding) / this.viewport.width;
        const relativeY = (top - padding) / this.viewport.height;
        const relativeWidth = width / this.viewport.width;
        const relativeHeight = height / this.viewport.height;

        this.selectedElement.bounding_box = [
            { x: relativeX.toFixed(4), y: relativeY.toFixed(4) },
            { x: (relativeX + relativeWidth).toFixed(4), y: relativeY.toFixed(4) },
            { x: (relativeX + relativeWidth).toFixed(4), y: (relativeY + relativeHeight).toFixed(4) },
            { x: relativeX.toFixed(4), y: (relativeY + relativeHeight).toFixed(4) }
        ];
    }

    startDrag(e, element) {
        if (this.selectedElement !== element) return;
        
        this.isDragging = true;
        this.dragStartPos = {
            x: e.clientX,
            y: e.clientY
        };
        this.originalBbox = JSON.parse(JSON.stringify(element.bounding_box));
    }

    handleDrag(e) {
        if (!this.isDragging || !this.selectedElement) return;

        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        
        const bbox = document.getElementById(`bbox-${this.selectedElement.id}`);
        if (bbox) {
            this.updateBboxPosition(bbox, dx, dy);
            this.dragStartPos = {
                x: e.clientX,
                y: e.clientY
            };
        }
    }

    endDrag() {
        this.isDragging = false;
        this.dragStartPos = null;
    }
}

// 파일 핸들러
const FileHandler = {
    async handleJsonUpload(event, state) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const jsonData = await this.readJson(file);
            state.jsonData = jsonData;
            state.jsonName = file.name;
            state.jsonFile = file;
            state.hasJson = true;
            Logger.updateStatus(file.name);
        } catch (error) {
            Logger.addLog('JSON 파일 처리 중 오류 발생');
        }
    },

    async handlePdfUpload(event, state) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const pdfDocument = await this.readPdf(file);
            state.pdfDocument = pdfDocument;
            state.pdfName = file.name;
            state.pdfFile = file;
            state.hasPdf = true;
            Logger.updateStatus(file.name);
        } catch (error) {
            Logger.addLog('PDF 파일 처리 중 오류 발생');
        }
    },

    async readJson(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    // 좌표 변환 로직...
                    Logger.addLog("JSON 파일 파싱 및 좌표 변환 완료");
                    resolve(jsonData);
                } catch (error) {
                    Logger.addLog("JSON 파일 형식이 올바르지 않습니다.");
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // FileHandler 내부의 readPdf 메서드
    async readPdf(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async function(event) {
                try {
                    const pdfData = event.target.result;
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                    const loadingTask = pdfjsLib.getDocument({data: pdfData});
                    const pdfDocument = await loadingTask.promise;
                    
                    Logger.addLog("PDF 파일 로드 완료");
                    resolve(pdfDocument);
                } catch (error) {
                    Logger.addLog("PDF 파일 형식이 올바르지 않습니다.");
                    reject(error);
                }
            };

            reader.onerror = function(error) {
                Logger.addLog('PDF 파일 읽기 중 오류 발생: ' + error);
                reject(error);
            };

            reader.readAsArrayBuffer(file);
        });
    },

    async renderPdfPage(pdfDocument, pageNumber, scale = 1.0) {
        try {
            const page = await pdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: scale });
            
            const canvas = document.getElementById('pdfCanvas');
            const context = canvas.getContext('2d');
            
            canvas.width = viewport.width + (CONFIG.PADDING * 2);
            canvas.height = viewport.height + (CONFIG.PADDING * 2);

            const container = document.getElementById('pdfContainer');
            if (container) {
                container.style.width = `${canvas.width}px`;
                container.style.height = `${canvas.height}px`;
            }

            if (appState.elementManager) {
                appState.elementManager.setViewport(viewport);
            }

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                transform: [1, 0, 0, 1, CONFIG.PADDING, CONFIG.PADDING]
            };

            await page.render(renderContext).promise;
            
            return {
                success: true,
                viewport,
                padding: CONFIG.PADDING,
                pageWidth: viewport.width,
                pageHeight: viewport.height
            };
        } catch (error) {
            Logger.addLog(`PDF 페이지 렌더링 중 오류 발생: ${error.message}`);
            console.error('PDF 렌더링 오류:', error);
            return { success: false };
        }
    }
}

// 이벤트 핸들러 설정
function setupEventHandlers(state) {
    // 전역 클릭 이벤트
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.bbox') && !e.target.closest('#elementsTable')) {
            state.elementManager?.deselectCurrentElement();
        }
    });

    // 드래그 이벤트
    document.addEventListener('mousemove', (e) => {
        state.elementManager?.handleDrag(e);
    });

    document.addEventListener('mouseup', () => {
        state.elementManager?.endDrag();
    });

    // ESC 키 이벤트
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            state.elementManager?.deselectCurrentElement();
        }
    });
}

// 로깅 시스템
const Logger = {
    addLog(message) {
        const timeStamp = Utils.getCurrentDateTime();
        const loggingText = document.getElementById('loggingText');
        if (loggingText) {
            loggingText.value += `${timeStamp} ${message}\n`;
            loggingText.scrollTop = loggingText.scrollHeight;
        }
    },

    updateStatus(filename) {
        const message = `${filename} 파일이 업로드되었습니다.`;
        this.addLog(message);
    }
};

// 페이지 핸들러
const PageHandler = {
    async handleStart(state) {
        if (!state.jsonData || !state.pdfDocument) {
            Logger.addLog("PDF와 JSON 파일을 모두 업로드해주세요.");
            return;
        }

        try {
            state.currentPage = 1;
            const result = await FileHandler.renderPdfPage(
                state.pdfDocument, 
                state.currentPage,
                state.currentZoom
            );
            
            if (result.success) {
                // 현재 페이지의 elements 필터링
                const pageElements = state.jsonData.elements.filter(
                    element => element.page === state.currentPage
                );

                // 기존 bbox 제거
                const container = document.getElementById('pdfContainer');
                container.querySelectorAll('.bbox').forEach(el => el.remove());
                
                // 새로운 bbox 생성 및 추가
                pageElements.forEach(element => {
                    const { div } = createBboxElement(element, result.viewport, result.padding);
                    container.appendChild(div);
                });

                // 테이블 업데이트
                TableManager.updateElementsTable(pageElements);
                Logger.addLog(`페이지 ${state.currentPage} 로드 완료`);
            }
        } catch (error) {
            Logger.addLog(`시작 중 오류 발생: ${error.message}`);
            console.error('Start error:', error);
        }
    },

    async handlePrevPage(state) {
        if (state.currentPage > 1) {
            state.currentPage--;
            await this.handleStart(state);
        }
    },

    async handleNextPage(state) {
        if (state.pdfDocument && state.currentPage < state.pdfDocument.numPages) {
            state.currentPage++;
            await this.handleStart(state);
        }
    }
};

// 전역 상태 객체
let appState = null;

// 초기화 및 메인 실행 코드
function initializeApp() {
    // 1. 상태 초기화
    appState = new AppState();

    // 2. 필수 DOM 요소 확인
    const requiredElements = [
        'pdfContainer',
        'pdfCanvas',
        'elementsTable',
        'loggingText',
        'jsonUploadButton',
        'pdfUploadButton',
        'startButton',
        'prevPageButton',
        'nextPageButton',
        'zoomInButton',
        'zoomOutButton',
        'zoomResetButton'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        return;
    }

    // 3. 버튼 및 입력 요소 초기화
    const elements = {
        jsonUpload: document.getElementById('jsonUploadButton'),
        pdfUpload: document.getElementById('pdfUploadButton'),
        startBtn: document.getElementById('startButton'),
        prevBtn: document.getElementById('prevPageButton'),
        nextBtn: document.getElementById('nextPageButton')
    };

    // 4. 이벤트 리스너 설정
    elements.jsonUpload.addEventListener('change', (e) => FileHandler.handleJsonUpload(e, appState));
    elements.pdfUpload.addEventListener('change', (e) => FileHandler.handlePdfUpload(e, appState));
    elements.startBtn.addEventListener('click', () => PageHandler.handleStart(appState));
    elements.prevBtn.addEventListener('click', () => PageHandler.handlePrevPage(appState));
    elements.nextBtn.addEventListener('click', () => PageHandler.handleNextPage(appState));

    // 5. ElementManager 초기화
    appState.elementManager = new ElementManager();

    // 6. 기타 설정
    setupEventHandlers(appState);
    ZoomControls.setup();
    TableManager.createEmptyTable();

    // 7. 초기 로그
    Logger.addLog('애플리케이션이 초기화되었습니다.');
}

// 유틸리티 함수들
function createBboxElement(element, viewport, padding = CONFIG.PADDING) {
    const bbox = element.bounding_box;
    const div = document.createElement('div');
    div.className = 'bbox';
    div.id = `bbox-${element.id}`;
    
    const { x, y, width, height } = BBoxUtils.calculatePosition(bbox, viewport, padding);
    BBoxUtils.applyBboxStyle(div, x, y, width, height, element.category);
    BBoxUtils.addAnnotation(div, element);
    
    setupBboxEvents(div, element);
    
    return { div, x, y, width, height };
}

function setupBboxEvents(div, element) {
    div.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (appState.elementManager) {
            appState.elementManager.selectElement(element, 'bbox');
            appState.elementManager.startDrag(e, element);
        }
    });
}

// 파일 이름 검사
function checkFileNames(jsonName, pdfName) {
    if (!jsonName || !pdfName) return false;
    
    const jsonBaseName = Utils.splitext(jsonName);
    const pdfBaseName = Utils.splitext(pdfName);
    
    const match = jsonBaseName === pdfBaseName;
    Logger.addLog(match ? "파일 이름이 일치합니다." : "파일 이름이 일치하지 않습니다.");
    
    return match;
}

// 앱 시작
document.addEventListener('DOMContentLoaded', initializeApp);

// 에러 핸들링
window.onerror = function(message, source, lineno, colno, error) {
    Logger.addLog(`오류 발생: ${message}`);
    console.error('Global error:', {message, source, lineno, colno, error});
    return false;
};

// 비동기 에러 핸들링
window.addEventListener('unhandledrejection', function(event) {
    Logger.addLog(`비동기 오류 발생: ${event.reason}`);
    console.error('Unhandled promise rejection:', event.reason);
});