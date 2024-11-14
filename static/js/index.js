import { addLog, checkFile } from './utils.js';
import { State, StateHandler } from './state.js';

// elements를 전역 변수로 선언
let elements;
let jsonFileName = null;
let pdfFileName = null;
let checkFileResult = false;
let pdfFile = null;
let jsonFile = null;
let currentPage = 1; 

const stateHandler = new StateHandler(); // 상태 관리 객체

const dict_color = {
    "table": "red",
    "figure": "dodgerblue",
    "chart": "limegreen",
    "heading1": "darkorange",
    "header": "orangered",
    "footer": "mediumorchid",
    "caption": "deeppink",
    "paragraph": "crimson", 
    "equation": "darkturquoise",
    "list": "chocolate",
    "index": "forestgreen",
    "footnote": "navy"
}

async function start(event) {
    addLog('button clicked');
    checkFileResult = checkFile(jsonFileName, pdfFileName);
    if (checkFileResult) {
        await loadPdf();
        await loadJson();
        await renderPdf();
        await renderJson();
        await renderBbox();
    }
}

function handleJsonUploadButton(event) {
    addLog(`handleJsonUpload: ${event.target.files[0].name}`);
    jsonFileName = event.target.files[0].name;
    jsonFile = event.target.files[0];
}

function handlePdfUploadButton(event) {
    addLog(`handlePdfUpload: ${event.target.files[0].name}`);
    pdfFileName = event.target.files[0].name;
    pdfFile = event.target.files[0];
}

async function loadPdf() {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // PDF 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
    });
    
    pdfFile = await loadingTask.promise;
    elements.totalPageLabel.textContent = `총 페이지: ${pdfFile.numPages}`;
    elements.currentPageLabel.textContent = `현재 페이지: ${currentPage}`;
    addLog(`PDF 로드 완료: 총 ${pdfFile.numPages} 페이지`);
}

async function loadJson() {
    const text = await jsonFile.text();
    const parsedJson = JSON.parse(text);

    jsonFile = parsedJson.elements.map(element => {
        const processedElement = {
            category: element.category,
            coordinates: element.coordinates,
            id: element.id,
            page: element.page
        };

        if (element.content?.text) {
            processedElement.text = element.content.text;
        }

        return processedElement;
    });
}

async function renderPdf() {
    // 현재 페이지 렌더링
    const page = await pdfFile.getPage(currentPage);
    const canvas = elements.pdfCanvas;

    const context = canvas.getContext('2d');

    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport //viewport에 대한 내용 추가적으로 공부 필요
    }).promise;

    addLog(`${currentPage} 페이지 렌더링 완료`);
}

async function renderJson() {
    const table = elements.elementTable;
    const tbody = table.querySelector('tbody');
    
    // tbody의 모든 행을 제거
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    const pageData = jsonFile.filter(element => element.page === currentPage) || [];
    
    // 실제 데이터 렌더링
    pageData.forEach(element => {
        const row = document.createElement('tr');
        const cells = [
            element.id,
            element.category || '', //여기에 select tag 기반으로 표시 필요.
            element.coordinates[0].x || '',  
            element.coordinates[0].y || '',  
            element.coordinates[2].x || '',  
            element.coordinates[2].y || ''   
        ];

        cells.forEach(cellData => {
            const cell = document.createElement('td');
            cell.textContent = cellData;
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });

    // 부족한 row 채우기
    const targetRowCount = 10;
    const remainingRows = targetRowCount - pageData.length;
    
    if (remainingRows > 0) {
        for (let i = 0; i < remainingRows; i++) {
            const emptyRow = document.createElement('tr');
            for (let j = 0; j < 6; j++) {
                const emptyCell = document.createElement('td');
                emptyRow.appendChild(emptyCell);
            }
            tbody.appendChild(emptyRow);
        }
    }

    addLog(`JSON 데이터 렌더링 완료: ${pageData.length}개 요소`);
}

function handleSaveButton(event) {
    addLog('save button clicked');
}

async function handlePrevPageButton(event) {
    addLog('prev page button clicked');
    if (currentPage == 1) {
        addLog('첫 페이지입니다.');
    } else {
        currentPage -= 1;
        await renderPdf();
        await renderJson();
        await renderBbox();
        elements.currentPageLabel.textContent = `현재 페이지: ${currentPage}`;
    }
}

async function handleNextPageButton(event) {
    addLog('next page button clicked');
    if (currentPage == pdfFile.numPages) {
        addLog('마지막 페이지입니다.');
    } else {
        currentPage += 1;
        await renderPdf();
        await renderJson();
        await renderBbox();
        elements.currentPageLabel.textContent = `현재 페이지: ${currentPage}`;
    }   
}

async function renderBbox() {
    try {
        const canvas = elements.pdfCanvas;
        const context = canvas.getContext('2d');
        
        // 현재 PDF 페이지 가져오기
        const page = await pdfFile.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });  // renderPdf와 동일한 scale 사용
        
        // PDF 페이지의 실제 크기
        const pdfWidth = viewport.width / viewport.scale;   // PDF의 원본 너비
        const pdfHeight = viewport.height / viewport.scale; // PDF의 원본 높이
        
        // 현재 페이지의 요소들 필터링
        const pageData = jsonFile.filter(element => element.page === currentPage) || [];
        
        pageData.forEach(element => {
            // 상대 좌표 추출 (0~1 사이의 값)
            const relativeX1 = element.coordinates[0].x;
            const relativeY1 = element.coordinates[0].y;
            const relativeX2 = element.coordinates[2].x;
            const relativeY2 = element.coordinates[2].y;
            
            // 1. 상대좌표를 PDF 크기에 맞게 변환
            const pdfX1 = relativeX1 * pdfWidth;
            const pdfY1 = relativeY1 * pdfHeight;
            const pdfX2 = relativeX2 * pdfWidth;
            const pdfY2 = relativeY2 * pdfHeight;
            
            // 2. viewport scale을 적용하여 캔버스 좌표로 변환
            const x1 = pdfX1 * viewport.scale;
            const y1 = pdfY1 * viewport.scale;
            const x2 = pdfX2 * viewport.scale;
            const y2 = pdfY2 * viewport.scale;
            
            // bbox 스타일 설정
            context.strokeStyle = dict_color[element.category];
            context.lineWidth = 4;
            
            // bbox 그리기
            context.beginPath();
            context.rect(x1, y1, x2 - x1, y2 - y1);
            context.stroke();
            
            // 텍스트 스타일 설정
            context.font = '16px Arial';
            
            // id와 category 텍스트 그리기
            const label = `id:${element.id}  ${element.category}`;
            
            // 텍스트 배경 그리기
            const textMetrics = context.measureText(label);
            const textHeight = 16;
            
            context.fillStyle = dict_color[element.category];
            context.fillRect(
                x1, 
                y1 - textHeight - 2, 
                textMetrics.width + 4, 
                textHeight
            );
            
            // 텍스트 그리기
            context.fillStyle = 'white';
            context.fillText(label, x1 + 2, y1 - 4);
        });
        
        addLog(`Bbox 렌더링 완료: ${pageData.length}개 요소`);
        
    } catch (error) {
        addLog(`Bbox 렌더링 오류: ${error.message}`);
        console.error('Bbox 렌더링 상세 에러:', error);
    }
}

function init() {
    elements = {
        jsonUploadButton: document.getElementById('jsonUploadButton'),
        pdfUploadButton: document.getElementById('pdfUploadButton'),
        startButton: document.getElementById('startButton'),
        pdfFrame: document.getElementById('pdfIframe'),
        elementTable: document.getElementById('elementTable'),
        textEdit: document.getElementById('textEdit'),
        loggingText: document.getElementById('loggingText'),
        saveButton: document.getElementById('saveButton'),
        prevPageButton: document.getElementById('prevPageButton'),
        nextPageButton: document.getElementById('nextPageButton'),
        pdfCanvas: document.getElementById('pdfCanvas'),
        currentPageLabel: document.getElementById('currentPageLabel'),
        totalPageLabel: document.getElementById('totalPageLabel'),
    };

    elements.startButton.addEventListener('click', start);
    elements.jsonUploadButton.addEventListener('change', handleJsonUploadButton);
    elements.pdfUploadButton.addEventListener('change', handlePdfUploadButton);
    elements.saveButton.addEventListener('click', handleSaveButton, true);
    elements.prevPageButton.addEventListener('click', handlePrevPageButton);
    elements.nextPageButton.addEventListener('click', handleNextPageButton);

    document.addEventListener('click', (event) => {
        addLog(`click!`);
    });

    addLog('초기화 완료');
}



// 여기가 최초 실행되는 부분
document.addEventListener('DOMContentLoaded', () => {
    init();
});
