const CONFIG = {
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
    }

    reset() {
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
    }
}

// 유틸리티 함수들
const Utils = {
    getCurrentDateTime() {
        return new Date().toLocaleString();
    }
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
            Logger.addLog(file.name + ' 파일이 업로드되었습니다.');
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
            Logger.addLog(file.name + ' 파일이 업로드되었습니다.');
        } catch (error) {
            Logger.addLog('PDF 파일 처리 중 오류 발생');
        }
    }
}


// 파일 자동 업로드
function uploadFile(){
    const jsonFile = new File(["{}"], "역도_0010_0019.json", {type: "application/json"});
    const pdfFile = new File(["{}"], "역도_0010_0019.pdf", {type: "application/pdf"});

    // JSON 파일 자동 업로드
    const dataTransferJson = new DataTransfer();
    dataTransferJson.items.add(jsonFile);
    jsonUploadButton.files = dataTransferJson.files;

    // PDF 파일 자동 업로드
    const dataTransferPdf = new DataTransfer();
    dataTransferPdf.items.add(pdfFile);
    pdfUploadButton.files = dataTransferPdf.files;

    // 파일 업로드 이벤트 트리거
    jsonUploadButton.dispatchEvent(new Event('change'));
    pdfUploadButton.dispatchEvent(new Event('change'));

    handleJsonUpload(jsonFile);
    handlePdfUpload(pdfFile);
}

function handleJsonUpload(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const jsonData = JSON.parse(event.target.result);
        console.log(jsonData); // JSON 데이터 처리
        // 추가적인 JSON 데이터 처리 로직
    };
    reader.readAsText(file);
}

function handlePdfUpload(file) {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        const pdfData = new Uint8Array(event.target.result);
        const loadingTask = pdfjsLib.getDocument(pdfData);
        loadingTask.promise.then(function(pdf) {
            console.log('PDF loaded');
            // PDF 페이지 렌더링 로직 추가
        });
    };
    fileReader.readAsArrayBuffer(file);
}

// 전역 상태 객체
let appState = null;

// 초기화 및 메인 실행 코드
function initializeApp() {
    // 1. 상태 초기화
    appState = new AppState();

    // 2. 파일 자동 업로드
    uploadFile();

    // 3. 버튼 및 입력 요소 초기화
    const elements = {
        jsonUpload: document.getElementById('jsonUploadButton'),
        pdfUpload: document.getElementById('pdfUploadButton'),
        startBtn: document.getElementById('startButton'),
        prevPageBtn: document.getElementById('prevPageButton'),
        nextPageBtn: document.getElementById('nextPageButton'),
        saveBtn: document.getElementById('saveButton'),
        // textEditArea: document.getElementById('textEditArea'),
        // 여기에 더 추가해야하는지 생각 해보자.
    }

    elements.jsonUpload.addEventListener('change', (e) => FileHandler.handleJsonUpload(e, appState));
    elements.pdfUpload.addEventListener('change', (e) => FileHandler.handlePdfUpload(e, appState));
    elements.startBtn.addEventListener('click', () => PageHandler.handleStart(appState));
    // 3. 파일 양식 파악 및 화면 구성 



    Logger.addLog('애플리케이션이 초기화되었습니다.');

    // 4. 필수 DOM 요소 확인
}

// 앱 시작
document.addEventListener('DOMContentLoaded', initializeApp);
