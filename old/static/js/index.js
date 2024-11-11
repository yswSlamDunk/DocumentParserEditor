function splitext(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return filename;
    }
    return filename.slice(0, lastDotIndex)
}

function getCurrentDataTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function addLog(message) {
    const timeStamp = getCurrentDataTime();
    loggingText.value += `${timeStamp} ${message}\n`;
    loggingText.scrollTop = loggingText.scrollHeight;
}

function updateStatus(filename) {// 이게 필요한 함수인지 의문
    let message = '';
    
    message = filename + " 파일이 업로드되었습니다.";
    addLog(message);
}

function checkFileNames(jsonName, pdfName) {
    let matchPdfJson = false;
    let message = '';
    
    if (jsonName && pdfName) {
        const jsonBaseName = splitext(jsonName);
        const pdfBaseName = splitext(pdfName);
        
        if (jsonBaseName !== pdfBaseName) {
            message = "두 파일의 이름이 다릅니다.";
            matchPdfJson = false;
        
        } else {
            message = "두 파일의 이름이 같습니다.";
            matchPdfJson = true;
        }

        addLog(message);
    }
    return matchPdfJson;
};

// 상대좌표 변환 함수
function convertToRelativeCoordinates(bbox, pageWidth, pageHeight) {
    return {
        x: (bbox.x / pageWidth).toFixed(4),
        y: (bbox.y / pageHeight).toFixed(4)
    };
}

// readJson 함수 수정
function readJson(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const jsonData = JSON.parse(event.target.result);
                
                // metadata에서 페이지 보 가져오기
                const pageInfo = jsonData.metadata.pages;
                
                // 각 요소의 좌표를 상대좌표로 변환
                jsonData.elements.forEach(element => {
                    const pageNumber = element.page;
                    const pageWidth = pageInfo[pageNumber - 1].width;
                    const pageHeight = pageInfo[pageNumber - 1].height;
                    
                    // 원본 좌표 저장
                    element.original_bounding_box = JSON.parse(JSON.stringify(element.bounding_box));
                    
                    // 상대좌표로 변환
                    element.bounding_box = element.bounding_box.map(point => 
                        convertToRelativeCoordinates(point, pageWidth, pageHeight)
                    );
                });
                
                addLog("JSON 파일 파싱 및 좌표 변환 완료");
                resolve(jsonData);
            }
            catch (error) {
                addLog("JSON 파일 형식이 올바르지 않습니다.");
                alert("JSON 형식이 올바르지 않습니다.");
                reject(false);
            }
        };

        reader.onerror = function(error) {
            addLog('JSON 파일 읽기 중 오류 발생: ' + error);
            alert("JSON 파일 읽기 중 오류 발생: " + error);
            reject(false);
        };

        reader.readAsText(file);
    });
}

function readPdf(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const pdfData = event.target.result;
                const pdfjsLib = window['pdfjs-dist/build/pdf'];
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                const loadingTask = pdfjsLib.getDocument({data: pdfData});
                
                const pdfDocument = await loadingTask.promise;
                
                addLog("PDF 파일 로드 완료");
                resolve(pdfDocument); 
            }
            catch (error) {
                addLog("PDF 파일 형식이 올바르지 않습니다.");
                alert("PDF 형식이 올바르지 않습니다.");
                reject(false);
            }
        };

        reader.onerror = function(error) {
            addLog('PDF 파일 읽기 중 오류 발생: ' + error);
            alert("PDF 일 읽기 중 오류 발생: " + error);
            reject(false);
        };

        reader.readAsArrayBuffer(file);
    });
}

async function renderPdfPage(pdfDocument, pageNumber, scale = 1.0) {
    try {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: scale });
        
        // viewport 정보 설정
        elementManager.setViewport(viewport);
        
        const canvas = document.getElementById('pdfCanvas');
        const context = canvas.getContext('2d');
        
        // 여백 추가
        const padding = 20;
        canvas.width = viewport.width + (padding * 2);
        canvas.height = viewport.height + (padding * 2);
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            transform: [1, 0, 0, 1, padding, padding]
        };
        
        await page.render(renderContext).promise;
        return { success: true, viewport, padding };
    } catch (error) {
        addLog(`PDF 페이지 렌더링 중 오류 발생: ${error}`);
        return { success: false };
    }
}

// Category 색상 매핑
const categoryColors = {
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
};

// bbox 좌표 텍스트 포맷 함수 수정
function getBboxCoordinates(bbox) {
    const x_min = (parseFloat(bbox[0].x) * 100).toFixed(2);
    const y_min = (parseFloat(bbox[0].y) * 100).toFixed(2);
    const x_max = (parseFloat(bbox[2].x) * 100).toFixed(2);
    const y_max = (parseFloat(bbox[2].y) * 100).toFixed(2);
    return `(${x_min}, ${y_min}), (${x_max}, ${y_max})`;  // % 제거
}

// bbox 요소 생성 함수 수정
function createBboxElement(element, viewport, padding = 20) {
    const bbox = element.bounding_box;
    const div = document.createElement('div');
    div.className = 'bbox';
    div.id = `bbox-${element.id}`;
    
    // 위치 계산 및 스타일 설정
    const { x, y, width, height } = calculatePosition(bbox, viewport, padding);
    applyBboxStyle(div, x, y, width, height, element.category);
    
    // annotation 추가
    addAnnotation(div, element);
    
    // 이벤트 설정
    setupBboxEvents(div, element);
    
    return { div, x, y, width, height };
}

// 드래그 이벤트 수정
function setupDragEvents(div, element, initialX, initialY, width, height, viewport) {
    let isDragging = false;
    let hasMoved = false;
    let lastClickTime = 0;
    const CLICK_DELAY = 300; // 300ms 딜레이
    let originalCoords = null;

    div.addEventListener('mousedown', function(e) {
        const currentTime = new Date().getTime();
        if (currentTime - lastClickTime < CLICK_DELAY) {
            return; // 너무 빠른 연속 클릭 무
        }
        lastClickTime = currentTime;

        isDragging = true;
        hasMoved = false;
        handleRowClick(element);
        e.stopPropagation();
        originalCoords = getBboxCoordinates(element.bounding_box);
    });

    document.addEventListener('mouseup', function() {
        if (isDragging && hasMoved) {
            const newCoords = getBboxCoordinates(element.bounding_box);
            addLog(`ID ${element.id}의 bbox가 좌표 ${originalCoords}에서 좌표 ${newCoords}로 변경되었습니다.`);
            updateTableBboxValue(element.id, newCoords);
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            hasMoved = true;
            e.preventDefault();
            
            const canvas = document.getElementById('pdfCanvas');
            const canvasRect = canvas.getBoundingClientRect();
            const containerWidth = document.getElementById('pdfContainer').clientWidth;
            const xOffset = (containerWidth - canvas.width) / 2;
            
            // 새로운 위치 계산 (Canvas 오프셋 고려)
            let newX = e.clientX - currentX - canvasRect.left + xOffset;
            let newY = e.clientY - currentY - canvasRect.top;
            
            // Canvas 역 내로 제한
            newX = Math.max(xOffset, Math.min(newX, xOffset + canvas.width - width));
            newY = Math.max(0, Math.min(newY, canvas.height - height));

            // bbox 위치 업데이트
            div.style.left = `${newX}px`;
            div.style.top = `${newY}px`;

            // 상대 좌표로 변환하여 저장
            const relativeX = (newX - xOffset - padding) / viewport.width;
            const relativeY = (newY - padding) / viewport.height;
            element.bounding_box[0] = { x: relativeX, y: relativeY };
            element.bounding_box[2] = { 
                x: relativeX + (width / viewport.width), 
                y: relativeY + (height / viewport.height) 
            };

            // 실시간으로 테이블 값 업데이트
            const newCoords = getBboxCoordinates(element.bounding_box);
            updateTableBboxValue(element.id, newCoords);
        }
    });

    return { isDragging };
}

// bbox 클릭 이벤트 설정 함수
function setupClickEvent(div, element, index, isDragging) {
    div.addEventListener('click', function(e) {
        if (!isDragging.isDragging) {
            handleRowClick(element);  // 동일한 핸들러 사용
        }
    });
}

// 기존 bbox 요소 제거 함수
function clearExistingBoxes() {
    const pdfContainer = document.getElementById('pdfContainer');
    const existingBoxes = pdfContainer.getElementsByClassName('bbox');
    while(existingBoxes.length > 0) {
        existingBoxes[0].remove();
    }
}

// 메인 함수
async function getPageImage(pdfDocument, pageNumber, jsonData_current, scale = 1.0) {
    try {
        // PDF 페이지 렌더링
        const renderResult = await renderPdfPage(pdfDocument, pageNumber, scale);
        if (!renderResult.success) return false;

        // 기존 bbox 제거
        clearExistingBoxes();

        const pdfContainer = document.getElementById('pdfContainer');

        // 각 요소에 대한 bbox 생성 및 이벤트 설정
        jsonData_current.forEach((element, index) => {
            const { div, x, y, width, height } = createBboxElement(element, renderResult.viewport, renderResult.padding);
            const dragState = setupDragEvents(div, element, x, y, width, height, renderResult.viewport);
            setupClickEvent(div, element, index, dragState);
            pdfContainer.appendChild(div);
        });

        addLog(`페이지 ${pageNumber} 렌더링 완료`);
        return true;

    } catch (error) {
        addLog(`페이지 ${pageNumber} 변환 중 오류 발생: ${error}`);
        return false;
    }
}

function createEmptyTable() {
    const container = document.getElementById('elementContainer');
    
    const table = document.createElement('table');
    table.id = 'elementsTable';  // 테이블에 ID 부여
    table.style.border = '1px solid black';
    table.style.borderCollapse = 'collapse';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th style="border:1px solid black; padding:5px;">ID</th>
            <th style="border:1px solid black; padding:5px;">Category</th>
            <th style="border:1px solid black; padding:5px;">Text</th>
            <th style="border:1px solid black; padding:5px;">BBox</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 빈 tbody 추가
    const tbody = document.createElement('tbody');
    // PDF 파일과 JSON 파일을 업로드주세요.
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding:20px;">

            </td>
        </tr>
    `;
    table.appendChild(tbody);
    
    container.appendChild(table);
}

function getSubText(text) {
    if (text.length > 50) {
        return text.substring(0, 50) + '...';
    }
    else {
        return text;
    }
}

function updateTable(jsonData_current) {
    const table = document.getElementById('elementsTable');
    const tbody = document.createElement('tbody');

    jsonData_current.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.elementId = element.id;  // element ID 추가
        
        const bboxText = getBboxCoordinates(element.bounding_box);
        const subText = getSubText(element.text);

        // Category select 생성
        const categorySelect = document.createElement('select');
        categorySelect.className = 'category-select';
        Object.keys(categoryColors).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            option.selected = category === element.category;
            categorySelect.appendChild(option);
        });

        // Category 변경 이벤트
        categorySelect.addEventListener('change', (e) => {
            e.stopPropagation();
            const newCategory = e.target.value;
            const oldCategory = element.category;
            element.category = newCategory;

            // bbox 스타일 업데이트
            const bbox = document.getElementById(`bbox-${element.id}`);
            if (bbox) {
                bbox.style.borderColor = categoryColors[newCategory];
                const annotation = bbox.querySelector('.bbox-annotation');
                if (annotation) {
                    annotation.style.backgroundColor = categoryColors[newCategory];
                    annotation.textContent = `${newCategory} (ID: ${element.id})`;
                }
            }
            addLog(`ID ${element.id}의 Category가 ${oldCategory}에서 ${newCategory}로 변경되었습니다.`);
        });

        // 셀 생성
        const categoryCell = document.createElement('td');
        categoryCell.appendChild(categorySelect);

        row.innerHTML = `
            <td>${element.id}</td>
            <td></td>
            <td>${subText}</td>
            <td>${bboxText}</td>
        `;
        row.children[1].appendChild(categorySelect);

        row.addEventListener('click', () => handleRowClick(element));
        tbody.appendChild(row);
    });
    
    table.replaceChild(tbody, table.getElementsByTagName('tbody')[0]);
}

// 파일 업로드 벤트 핸들러
function handleJsonUpload(e, state) {
    if (e.target.files.length > 0) {
        state.jsonFile = e.target.files[0];
        state.jsonName = state.jsonFile.name;
        state.hasJson = true;
        updateStatus(state.jsonName);
    }
}

function handlePdfUpload(e, state) {
    if (e.target.files.length > 0) {
        state.pdfFile = e.target.files[0];
        state.pdfName = state.pdfFile.name;
        state.hasPdf = true;
        updateStatus(state.pdfName);
    }
}

// 시작 버튼 핸들러
async function handleStart(state) {
    if (!state.jsonData || !state.pdfDocument) {
        addLog("PDF와 JSON 파일을 모두 업로드해주세요.");
        return;
    }

    if (!checkFileNames(state.jsonName, state.pdfName)) {
        addLog("파일 이름이 일치하지 않습니다. 계속하시겠습니까?");
        // 필요한 경우 여기에 사용자 확인 로직 추가
    }

    try {
        // 첫 페이지 렌더링
        state.currentPage = 1;
        const result = await renderPdfPage(state.pdfDocument, state.currentPage);
        
        if (result.success) {
            // 현재 페이지의 elements 필터링
            const pageElements = state.jsonData.elements.filter(
                element => element.page === state.currentPage
            );

            // bbox 요소들 생성 및 표시
            const container = document.getElementById('pdfContainer');
            pageElements.forEach(element => {
                const { div } = createBboxElement(element, result.viewport, result.padding);
                container.appendChild(div);
            });

            // 테이블 업데이트
            updateElementsTable(pageElements);
            
            addLog(`페이지 ${state.currentPage} 로드 완료`);
        }
    } catch (error) {
        addLog(`시작 중 오류 발생: ${error}`);
    }
}

// 테이블 업데이트 함수
function updateElementsTable(elements) {
    const tbody = document.querySelector('#elementsTable tbody');
    tbody.innerHTML = ''; // 테이블 초기화

    elements.forEach(element => {
        const row = document.createElement('tr');
        row.setAttribute('data-element-id', element.id);
        
        row.innerHTML = `
            <td>${element.id}</td>
            <td>${element.category}</td>
            <td>${getBboxCoordinates(element.bounding_box)}</td>
        `;

        // 행 클릭 이벤트 추가
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.elementManager) {
                state.elementManager.selectElement(element, 'table');
            }
        });

        tbody.appendChild(row);
    });
}

// 페이지 이동 핸들러
async function handlePrevPage(state) {
    if (state.matchPdfJson && state.jsonData && state.currentPage > 0) {
        state.currentPage--;
        let jsonData_current = state.jsonData.elements.filter(element => element.page === state.currentPage + 1);
        const pdfSuccess = await getPageImage(state.pdfDocument, state.currentPage + 1, jsonData_current);
        
        if (pdfSuccess) {
            updateTable(jsonData_current);
            addLog(`페이지 ${state.currentPage + 1}로 이동했습니다.`);
        }
    }
}

async function handleNextPage(state) {
    if (state.matchPdfJson && state.jsonData && state.currentPage < state.jsonData.billed_pages - 1) {
        state.currentPage++;
        let jsonData_current = state.jsonData.elements.filter(element => element.page === state.currentPage + 1);
        const pdfSuccess = await getPageImage(state.pdfDocument, state.currentPage + 1, jsonData_current);
        
        if (pdfSuccess) {
            updateTable(jsonData_current);
            addLog(`페이지 ${state.currentPage + 1}로 이동했습니다.`);
        }
    }
}

// 태 초기화 함수
function resetState(state) {
    state.hasJson = false;
    state.hasPdf = false;
    state.jsonName = '';
    state.pdfName = '';
    state.jsonData = null;
    state.pdfDocument = null;
}

// 줌 관련 상태 추가
let currentZoom = 1.0;
const zoomStep = 0.1;

// 줌 컨트롤 이벤트 설정
function setupZoomControls() {
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomLevel = document.getElementById('zoomLevel');

    zoomIn.addEventListener('click', () => {
        currentZoom += zoomStep;
        updateZoom();
    });

    zoomOut.addEventListener('click', () => {
        currentZoom = Math.max(0.1, currentZoom - zoomStep);
        updateZoom();
    });

    function updateZoom() {
        zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
        renderCurrentPage();
    }
}

// 테이블 생성 함수
function createTable(jsonData_current) {
    const table = document.createElement('table');
    table.id = 'elementsTable';
    
    // 헤더 생성
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Text</th>
            <th>BBox</th>
        </tr>
    `;
    table.appendChild(thead);

    // 바디 생성
    const tbody = document.createElement('tbody');
    jsonData_current.forEach(element => {
        const row = createTableRow(element);
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return table;
}

// 이블 행 생성 함수
function createTableRow(element) {
    const row = document.createElement('tr');
    row.dataset.elementId = element.id;
    
    // ID 열
    const idCell = document.createElement('td');
    idCell.textContent = element.id;
    
    // Category 열 (select 태그 포함)
    const categoryCell = document.createElement('td');
    const categorySelect = createCategorySelect(element);
    categoryCell.appendChild(categorySelect);
    
    // Text 열
    const textCell = document.createElement('td');
    textCell.textContent = truncateText(element.text, 50);
    textCell.title = element.text; // 전체 텍스트를 팁으로 표시
    
    // BBox 열
    const bboxCell = document.createElement('td');
    bboxCell.textContent = getBboxCoordinates(element.bounding_box);
    bboxCell.dataset.originalValue = bboxCell.textContent; // 원래 값 저장
    
    // 행에 열 추가
    row.appendChild(idCell);
    row.appendChild(categoryCell);
    row.appendChild(textCell);
    row.appendChild(bboxCell);
    
    // 행 클릭 이벤트
    row.addEventListener('click', () => handleRowClick(element, row));
    
    return row;
}

// Category 선택 컴포넌트 생성
function createCategorySelect(element) {
    const select = document.createElement('select');
    select.className = 'category-select';
    const originalCategory = element.category; // 원래  저장
    
    Object.keys(categoryColors).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        option.selected = category === element.category;
        select.appendChild(option);
    });
    
    // 카테고리 변경 이벤트
    select.addEventListener('change', (e) => {
        e.stopPropagation(); // 행 클릭 이벤트 전파 방지
        const newCategory = e.target.value;
        
        // bbox 스타일 업데이트
        const bbox = document.getElementById(`bbox-${element.id}`);
        if (bbox) {
            bbox.style.borderColor = categoryColors[newCategory];
            
            // annotation 업데이트
            const annotation = bbox.querySelector('.bbox-annotation');
            if (annotation) {
                annotation.style.backgroundColor = categoryColors[newCategory];
                annotation.textContent = `${newCategory} (ID: ${element.id})`;
            }
        }
        
        // 로그 추가
        addLog(`ID ${element.id}의 Category가 ${originalCategory}에서 ${newCategory}로 변경되었습니다.`);
        
        // element 업데이트
        element.category = newCategory;
    });
    
    return select;
}

// 활성화된 element를 추적하기 위한 전역 변수
let activeElementId = null;
let currentPageElements = new Map(); // 현재 페이지의 elements 저장

// 테이블 row 클릭 이벤트 핸들러
function handleRowClick(element) {
    // 이전 선된 row의 이라이트 제거
    const allRows = document.querySelectorAll('#elementsTable tbody tr');
    allRows.forEach(row => row.classList.remove('highlighted'));
    
    // 현재 row 하이라이트
    const currentRow = document.querySelector(`#elementsTable tbody tr[data-element-id="${element.id}"]`);
    if (currentRow) {
        currentRow.classList.add('highlighted');
    }
    
    // element 활성화
    activateElement(element);
    
    addLog(`ID ${element.id} 선택됨`);
}

// Element 활성화 함수
function activateElement(element) {
    if (activeElementId !== element.id) {
        deactivateElement();
        activeElementId = element.id;
        
        // bbox 활성화
        const bbox = document.getElementById(`bbox-${element.id}`);
        if (bbox) {
            bbox.classList.add('active');
        }
        
        // 테이블 row 하이라이트
        const row = document.querySelector(`#elementsTable tbody tr[data-element-id="${element.id}"]`);
        if (row) {
            row.classList.add('highlighted');
        }
        
        addLog(`ID ${element.id} 선택됨`);
    }
}

// Element 비활성화 함수
function deactivateElement() {
    if (activeElementId !== null) {
        const bbox = document.getElementById(`bbox-${activeElementId}`);
        if (bbox) {
            bbox.classList.remove('active');
        }
        
        const row = document.querySelector(`#elementsTable tbody tr[data-element-id="${activeElementId}"]`);
        if (row) {
            row.classList.remove('highlighted');
        }
        
        addLog(`ID ${activeElementId} 선택 해제됨`);
        activeElementId = null;
    }
}

// 전역 이벤트 리스너 설정
function setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.bbox') && !e.target.closest('#elementsTable')) {
            if (activeElementId !== null) {
                deactivateElement();
            }
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeElementId !== null) {
            deactivateElement();
        }
    });
}

// 초기화 시 ��벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    setupGlobalEventListeners();
    createEmptyTable();
    
    // DOM 요소 가져오기
    const jsonInput = document.getElementById('jsonUploadButton');
    const pdfInput = document.getElementById('pdfUploadButton');
    const startButton = document.getElementById('startButton');
    const prevButton = document.getElementById('exPageButton');
    const nextButton = document.getElementById('nextPageButton');
    const saveButton = document.getElementById('savePageButton');
    
    // 상태 객체 생성
    const state = {
        hasJson: false,
        hasPdf: false,
        jsonName: '',
        pdfName: '',
        currentPage: 0,
        jsonData: null,
        pdfDocument: null,
        jsonFile: null,
        pdfFile: null,
        matchPdfJson: false
    };

    // 이벤트 리스너 등록
    jsonInput.addEventListener('change', (e) => handleJsonUpload(e, state));
    pdfInput.addEventListener('change', (e) => handlePdfUpload(e, state));
    startButton.addEventListener('click', () => handleStart(state));
    prevButton.addEventListener('click', () => handlePrevPage(state));
    nextButton.addEventListener('click', () => handleNextPage(state));
    setupZoomControls();
    setupTextEditor();
});

function updateTableBboxValue(elementId, newCoords) {
    const row = document.querySelector(`#elementsTable tbody tr[data-element-id="${elementId}"]`);
    if (row) {
        const bboxCell = row.querySelector('td:nth-child(4)');
        if (bboxCell) {
            bboxCell.textContent = newCoords;
        }
    }
}

// bbox 관리를 위한 클래스 추가
class BBoxManager {
    constructor(selectionManager, dragManager) {
        this.selectionManager = selectionManager;
        this.dragManager = dragManager;
    }

    createBboxElement(element, viewport, padding = 20) {
        const bbox = element.bounding_box;
        const div = document.createElement('div');
        div.className = 'bbox';
        div.id = `bbox-${element.id}`;
        
        // 위치 계산 및 스타일 설정
        const { x, y, width, height } = this.calculatePosition(bbox, viewport, padding);
        this.applyStyle(div, x, y, width, height, element.category);
        
        // annotation 추가
        this.addAnnotation(div, element);
        
        // 이벤트 설정
        this.setupEvents(div, element);
        
        return { div, x, y, width, height };
    }

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
    }

    applyStyle(div, x, y, width, height, category) {
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;
        div.style.borderColor = categoryColors[category] || 'red';
    }

    addAnnotation(div, element) {
        const annotation = document.createElement('div');
        annotation.className = 'bbox-annotation';
        annotation.textContent = `${element.category} (ID: ${element.id})`;
        annotation.style.backgroundColor = categoryColors[element.category];
        annotation.style.color = 'white';
        div.appendChild(annotation);
    }

    setupEvents(div, element) {
        let startX, startY;
        
        div.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
            const coords = getBboxCoordinates(element.bounding_box);
            this.dragManager.startDrag(element, coords);
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (this.dragManager.isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    this.dragManager.hasMoved = true;
                    this.updateBboxPosition(div, element, dx, dy);
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.dragManager.isDragging && this.dragManager.hasMoved) {
                const newCoords = getBboxCoordinates(element.bounding_box);
                this.dragManager.updatePosition(element, newCoords);
            }
            this.dragManager.isDragging = false;
        });
    }

    updateBboxPosition(div, element, dx, dy) {
        const newLeft = div.offsetLeft + dx;
        const newTop = div.offsetTop + dy;
        div.style.left = `${newLeft}px`;
        div.style.top = `${newTop}px`;
        
        // bounding_box 좌표 업데이트
        const viewport = document.getElementById('pdfCanvas').getBoundingClientRect();
        element.bounding_box = this.calculateNewBoundingBox(newLeft, newTop, div.offsetWidth, div.offsetHeight, viewport);
    }
}

// 선택 관리를 위한 클래스 추가
class SelectionManager {
    constructor() {
        this.activeElementId = null;
        this.lastClickTime = 0;
        this.CLICK_DELAY = 300;
    }

    setActiveElement(element, source = 'bbox') {
        const currentTime = new Date().getTime();
        if (currentTime - this.lastClickTime < this.CLICK_DELAY) {
            return;
        }
        this.lastClickTime = currentTime;

        if (this.activeElementId !== element.id) {
            this.deactivateElement();
            this.activeElementId = element.id;
            this.updateUI(element);
            addLog(`ID ${element.id} 선택됨`);
        }
    }

    updateUI(element) {
        // bbox 하이라이트
        const bbox = document.getElementById(`bbox-${element.id}`);
        if (bbox) {
            bbox.classList.add('active');
        }

        // 테이블 row 이라이트
        const row = document.querySelector(`#elementsTable tbody tr[data-element-id="${element.id}"]`);
        if (row) {
            row.classList.add('highlighted');
        }
    }
}

// 드래그 관리를 위한 클래스 추가
class DragManager {
    constructor(selectionManager) {
        this.isDragging = false;
        this.hasMoved = false;
        this.originalCoords = null;
        this.selectionManager = selectionManager;
    }

    startDrag(element, coords) {
        this.isDragging = true;
        this.hasMoved = false;
        this.originalCoords = coords;
        this.selectionManager.setActiveElement(element);
    }

    updatePosition(element, newCoords) {
        if (this.isDragging && this.hasMoved) {
            updateTableBboxValue(element.id, newCoords);
            this.logPositionChange(element, this.originalCoords, newCoords);
        }
    }

    logPositionChange(element, oldCoords, newCoords) {
        addLog(`ID ${element.id}의 bbox가 좌표 ${oldCoords}에서 좌표 ${newCoords}로 변경되었습니다.`);
    }
}

// 이벤트 핸들러 설정
function setupEventHandlers(elementManager) {
    // 전역 클릭 이벤트
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.bbox') && !e.target.closest('#elementsTable')) {
            elementManager.deselectCurrentElement();
        }
    });

    // ESC 키 이벤트
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elementManager.deselectCurrentElement();
        }
    });

    // 드래그 이벤트
    document.addEventListener('mousemove', (e) => {
        elementManager.handleDrag(e);
    });

    document.addEventListener('mouseup', () => {
        elementManager.endDrag();
    });
}

// bbox 생성 함수 수정
function createBboxElement(element, viewport, padding = 20) {
    const bbox = element.bounding_box;
    const div = document.createElement('div');
    div.className = 'bbox';
    div.id = `bbox-${element.id}`;
    
    // 위치 계산 및 스타일 설정
    const { x, y, width, height } = calculatePosition(bbox, viewport, padding);
    applyBboxStyle(div, x, y, width, height, element.category);
    
    // annotation 추가
    addAnnotation(div, element);
    
    // 이벤트 설정
    setupBboxEvents(div, element);
    
    return { div, x, y, width, height };
}

function setupBboxEvents(div, element) {
    div.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (elementManager) {
            elementManager.selectElement(element, 'bbox');
            elementManager.startDrag(e, element);
        }
    });
}

// 테이블 row 이벤트 설정
function setupTableRowEvents(row, element) {
    row.addEventListener('click', (e) => {
        e.stopPropagation();
        elementManager.selectElement(element, 'table');
    });
}

class ElementManager {
    constructor() {
        this.selectedElement = null;
        this.isDragging = false;
        this.dragStartPos = null;
        this.originalBbox = null;
        this.viewport = null; // viewport 정보 저장
    }

    // viewport 설정 메서드 추가
    setViewport(viewport) {
        this.viewport = viewport;
    }

    updateBboxPosition(bbox, dx, dy) {
        if (!this.selectedElement || !this.viewport) return;

        const newLeft = bbox.offsetLeft + dx;
        const newTop = bbox.offsetTop + dy;
        
        // DOM 요소 위치 업데이트
        bbox.style.left = `${newLeft}px`;
        bbox.style.top = `${newTop}px`;
        
        // bounding_box 좌표 업데이트
        this.updateBoundingBoxCoordinates(newLeft, newTop, bbox.offsetWidth, bbox.offsetHeight);
    }

    updateBoundingBoxCoordinates(left, top, width, height) {
        if (!this.selectedElement || !this.viewport) return;

        const canvas = document.getElementById('pdfCanvas');
        const padding = 20; // 기본 패딩값

        // 상대 좌표 계산
        const relativeX = (left - padding) / this.viewport.width;
        const relativeY = (top - padding) / this.viewport.height;
        const relativeWidth = width / this.viewport.width;
        const relativeHeight = height / this.viewport.height;

        // bounding_box 업데이트
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

    // endDrag 메서드는 이전과 동일
}

// 위치 계산 관련 유틸리티 함수들
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
        div.style.borderColor = categoryColors[category] || 'red';
    },

    addAnnotation(div, element) {
        const annotation = document.createElement('div');
        annotation.className = 'bbox-annotation';
        annotation.textContent = `${element.category} (ID: ${element.id})`;
        annotation.style.backgroundColor = categoryColors[element.category];
        annotation.style.color = 'white';
        div.appendChild(annotation);
    }
};

// 3. ElementManager 클래스
class ElementManager {
    constructor() {
        this.selectedElement = null;
        this.isDragging = false;
        this.dragStartPos = null;
        this.originalBbox = null;
    }

    // ... ElementManager 메서드들
}

// 4. 요소 생성 및 이벤트 처리 함수들
function createBboxElement(element, viewport, padding = 20) {
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

// 5. 이벤트 핸들러 설정
function setupBboxEvents(div, element) {
    div.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (elementManager) {
            elementManager.selectElement(element, 'bbox');
            elementManager.startDrag(e, element);
        }
    });
}

// 6. 초기화 함수
function initializeApp() {
    let state = {
        hasJson: false,
        hasPdf: false,
        jsonName: '',
        pdfName: '',
        currentPage: 0,
        jsonData: null,
        pdfDocument: null,
        jsonFile: null,
        pdfFile: null,
        matchPdfJson: false,
        elementManager: null
    };

    state.elementManager = new ElementManager();
    setupEventHandlers(state.elementManager);
    setupGlobalEventListeners();
    createEmptyTable();
    
    const jsonUploadButton = document.getElementById('jsonUploadButton');
    const pdfUploadButton = document.getElementById('pdfUploadButton');
    const startButton = document.getElementById('startButton');
    const prevButton = document.getElementById('exPageButton');
    const nextButton = document.getElementById('nextPageButton');
    
    jsonUploadButton.addEventListener('change', (e) => handleJsonUpload(e, state));
    pdfUploadButton.addEventListener('change', (e) => handlePdfUpload(e, state));
    startButton.addEventListener('click', () => handleStart(state));
    prevButton.addEventListener('click', () => handlePrevPage(state));
    nextButton.addEventListener('click', () => handleNextPage(state));
    
    setupZoomControls();
    setupTextEditor();
}

// 7. 파일 업로드 핸들러
async function handleJsonUpload(event) {
    const file = event.target.files[0];
    if (file) {
        try {
            const jsonData = await readJson(file);
            // JSON 데이터 처리 로직
            updateStatus(file.name);
        } catch (error) {
            addLog('JSON 파일 처리 중 오류 발생');
        }
    }
}

async function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (file) {
        try {
            const pdfDocument = await readPdf(file);
            // PDF 문서 처리 로직
            updateStatus(file.name);
        } catch (error) {
            addLog('PDF 파일 처리 중 오류 발생');
        }
    }
}

// 8. DOMContentLoaded 이벤트 리스너
document.addEventListener('DOMContentLoaded', initializeApp);