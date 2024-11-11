import * as index from './index.js';

window.addEventListener('DOMContentLoaded', (event) => {    
    document.getElementById('pdfUploadButton').addEventListener('change', function(event) {
        const file = event.target.files[0];
    if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            renderPDF(data);

            // Save file info and data as JSON
            const fileInfo = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: Array.from(data)
            };
            localStorage.setItem('uploadedPdf', JSON.stringify(fileInfo));
        };
        reader.readAsArrayBuffer(file);
        }
    });

    document.getElementById('jsonUploadButton').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);

            // Save file info and data as JSON
            const fileInfo = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: data
            };
            localStorage.setItem('uploadedJson', JSON.stringify(fileInfo));
        };
        reader.readAsText(file);
        }
    });     
});

// Load saved PDF, JSON from localStorage on page load
window.addEventListener('DOMContentLoaded', (event) => {
    const savedPdfFileInfo = JSON.parse(localStorage.getItem('uploadedPdf'));
    const savedJsonFileInfo = JSON.parse(localStorage.getItem('uploadedJson'));
    if (savedPdfFileInfo.data && savedJsonFileInfo.data) {
        index.start();
    }
});

const elements = {
    jsonUploadButton: document.getElementById('jsonUploadButton'),
    pdfUploadButton: document.getElementById('pdfUploadButton'),
    startButton: document.getElementById('startButton'),
    pdfFrame: document.getElementById('pdfIframe'),
    elementTable: document.getElementById('elementTable'),
    textEditArea: document.getElementById('textEditArea'),
    loggingArea: document.getElementById('loggingArea'),
}

export function start(){
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


// function renderPDF(data) {
//     const loadingTask = pdfjsLib.getDocument({data: data});
//     loadingTask.promise.then(function(pdf) {
//         pdf.getPage(1).then(function(page) {
//             const scale = 1.5;
//             const viewport = page.getViewport({ scale: scale });

//             const canvas = document.getElementById('pdf-canvas');
//             const context = canvas.getContext('2d');
//             canvas.height = viewport.height;
//             canvas.width = viewport.width;

//             const renderContext = {
//                 canvasContext: context,
//                 viewport: viewport
//             };
//             page.render(renderContext);
//         });
//     });
// }

// // Load saved PDF from localStorage on page load
// window.addEventListener('DOMContentLoaded', (event) => {
//     const savedFileInfo = JSON.parse(localStorage.getItem('uploadedPdf'));
//     if (savedFileInfo && savedFileInfo.data) {
//         const data = new Uint8Array(savedFileInfo.data);
//         renderPDF(data);
//     }
// });
