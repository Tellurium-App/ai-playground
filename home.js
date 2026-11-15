// 「解説を読む」でダイアログを開く。閉じるのは閉じるボタン・Esc・外側のクリック
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dialog]');
  if (btn) { document.getElementById(btn.dataset.dialog).showModal(); return; }
  if (e.target instanceof HTMLDialogElement) e.target.close();
});
