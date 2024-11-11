let loggingTextElement = null;

export function initLogging() {
    loggingTextElement = document.getElementById('loggingText');
    if (!loggingTextElement) {
        console.error('로깅 텍스트 영역을 찾을 수 없습니다.');
        return false;
    }
    console.log('로깅 초기화 성공');
    return true;
}

function getCurrentDateTime() {
    const now = new Date();
    const format = (num) => String(num).padStart(2, '0');
    return `${now.getFullYear()}-${format(now.getMonth() + 1)}-${format(now.getDate())} ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
}

export function addLog(message) {
    if (!loggingTextElement && !initLogging()) {
        console.error('로깅을 초기화할 수 없습니다.');
        return;
    }

    const timeStamp = getCurrentDateTime();
    try {
        loggingTextElement.value += `${timeStamp}  ${message}\n`;
        loggingTextElement.scrollTop = loggingTextElement.scrollHeight;
        console.log(`로그 추가됨: ${message}`);
    } catch (error) {
        console.error('로그 추가 중 오류 발생:', error);
    }
}
