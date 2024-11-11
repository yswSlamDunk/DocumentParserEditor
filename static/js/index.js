import { addLog, initLogging } from './utils.js';

// elements를 전역 변수로 선언
let elements;

function start() {
    console.log('start 함수 호출됨');
    addLog('start');
}

function handleJsonUpload(event) {
    console.log('JSON 업로드 이벤트 발생');
    addLog(`handleJsonUpload: ${event.target.files[0].name}`);
}

function handlePdfUpload(event) {
    console.log('PDF 업로드 이벤트 발생');
    addLog(`handlePdfUpload: ${event.target.files[0].name}`);
}

function init() {
    console.log('init 함수 시작');
    
    elements = {
        jsonUploadButton: document.getElementById('jsonUploadButton'),
        pdfUploadButton: document.getElementById('pdfUploadButton'),
        startButton: document.getElementById('startButton'),
        pdfFrame: document.getElementById('pdfIframe'),
        elementTable: document.getElementById('elementTable'),
        textEdit: document.getElementById('textEdit'),
        loggingText: document.getElementById('loggingText'),
    };

    // initLogging 함수 호출
    if (!initLogging()) {
        console.error('로깅 초기화 실패');
        return;
    }

    elements.startButton.addEventListener('click', start);
    elements.jsonUploadButton.addEventListener('change', handleJsonUpload);
    elements.pdfUploadButton.addEventListener('change', handlePdfUpload);

    console.log('Elements initialized:', elements);
    addLog('초기화 완료');
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded 이벤트 발생');
    init();
});
