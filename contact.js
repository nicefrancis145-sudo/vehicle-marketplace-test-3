const contactForm = document.querySelector('#contact-form');
const contactStatus = document.querySelector('#contact-status');

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const { supportEmail } = window.STORE_CONFIG;
  if (!supportEmail) {
    contactStatus.textContent = 'No support email is set yet. Add one to supportEmail in store-config.js to prepare an email.';
    return;
  }

  const formData = new FormData(contactForm);
  const subject = encodeURIComponent(`Message from ${formData.get('name')}`);
  const body = encodeURIComponent(
    `From: ${formData.get('name')} (${formData.get('email')})\n\n${formData.get('message')}`
  );
  window.location.href = `mailto:${encodeURIComponent(supportEmail)}?subject=${subject}&body=${body}`;
  contactStatus.textContent = 'Your email app should open with a draft. The message is not sent by this website.';
});
