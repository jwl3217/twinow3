async function onClickCreate() {
  try {
    const resp = await fetch(
  'https://us-central1-<YOUR_PROJECT>.cloudfunctions.net/api/createPayment',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantUid:      `MO-${Date.now()}`,
      amount:           1000,
      depositorName:    '홍길동',
      buyerPhone:       '01012345678',
      buyerEmail:       'hong@example.com',
      cashbillType:     '소득공제',           // 필요 없다면 아예 빼세요
      cashbillIdentifier: '01012345678'       // 동일
    })
  }
);

    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || '주문 생성 실패');
    console.log('주문 생성 성공:', result);
  } catch (err) {
    console.error('결제 주문 생성 에러:', err);
    alert(err.message);
  }
}
