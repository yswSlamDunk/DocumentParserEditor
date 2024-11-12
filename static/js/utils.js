function getCurrentDateTime() {
    const now = new Date();
    const format = (num) => String(num).padStart(2, '0');
    return `${now.getFullYear()}-${format(now.getMonth() + 1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
}

export function addLog(message) {
    const loggingTextElement = document.getElementById('loggingText');
    const timeStamp = getCurrentDateTime();
    loggingTextElement.value += `${timeStamp}  ${message}\n`;
    loggingTextElement.scrollTop = loggingTextElement.scrollHeight;
}

export function checkFile(jsonFileName, pdfFileName) {
    jsonFileName = jsonFileName.split('.')[0];
    pdfFileName = pdfFileName.split('.')[0];
    
    if (!jsonFileName || !pdfFileName) {
        alert('JSON 및 PDF 파일을 선택해주세요.');
        addLog('JSON 및 PDF 파일 업로드 실패')
        return false;
    }   
    
    if (jsonFileName === pdfFileName) {
        addLog('JSON 및 PDF 파일 이름이 같습니다.');
        return true;
    }
    addLog('JSON 및 PDF 파일 이름이 다릅니다.');
    return false;
}
