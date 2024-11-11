import * as utils from './utils.js';

const elements = {
    jsonUploadButton: document.getElementById('jsonUploadButton'),
    pdfUploadButton: document.getElementById('pdfUploadButton'),
    startButton: document.getElementById('startButton'),
    pdfFrame: document.getElementById('pdf-frame'),
    textArea: document.getElementById('text-area'),
}

function start(){
    utils.addLog('start');
}

function handleJsonUpload(event){
    utils.addLog(`handleJsonUpload: ${event.target.files[0].name}`);
}

function handlePdfUpload(event){
    utils.addLog(`handlePdfUpload: ${event.target.files[0].name}`);
}

function init(){
    elements.startButton.addEventListener('click', start);
    elements.jsonUploadButton.addEventListener('change', handleJsonUpload);
    elements.pdfUploadButton.addEventListener('change', handlePdfUpload);
    utils.addLog('init');
}

document.addEventListener('DOMContentLoaded', init);