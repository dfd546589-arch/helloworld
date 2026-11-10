const request = require('request');

module.exports = async (req, res) => {
    // 주소창 뒷부분에서 암호화된 URL 추출
    let encryptedPath = req.url.split('?')[0].slice(1);
    
    // 메인 페이지이거나 주소가 없으면 패스 (프론트엔드에서 처리)
    if (!encryptedPath || encryptedPath === 'api') {
        res.status(404).send('Not Found');
        return;
    }

    try {
        // Base64 주소 복원
        let base64 = encryptedPath.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) { base64 += '='; }
        const targetUrl = Buffer.from(base64, 'base64').toString('utf8');

        // 유튜브 등 동영상 스트리밍을 위한 헤더 복사 (Range 헤더 필수 전달)
        const proxyHeaders = { ...req.headers };
        delete proxyHeaders.host;
        delete proxyHeaders.connection;

        // 원본 서버로 요청 중계 (스트리밍 파이핑 구조)
        const proxyRequest = request({
            url: targetUrl,
            method: req.method,
            headers: proxyHeaders,
            followRedirect: true,
            strictSSL: false
        });

        // 에러 발생 시 처리
        proxyRequest.on('error', (err) => {
            res.status(500).send('Proxy Connection Error');
        });

        // 목적지 서버의 응답을 사용자 브라우저로 실시간 스트리밍 복사
        req.pipe(proxyRequest).pipe(res);

    } catch (err) {
        res.status(400).send('Invalid Address');
    }
};
