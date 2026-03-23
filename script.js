/**
 * Interactive Script for Antigravity Survey - n8n Integration
 */

document.addEventListener('DOMContentLoaded', () => {
    // Definición de constantes para evitar errores
    const WEBHOOK_URL = 'https://msaritama.app.n8n.cloud/webhook/7fa92e4c-f06c-4440-9c81-95cf7e902174';
    const SEC_KEY = 'n8n_test_webhook';

    const surveyForm = document.getElementById('survey-form');
    const successScreen = document.getElementById('success-screen');
    const restartButton = document.getElementById('restart-button');
    const submitBtn = document.getElementById('submit-button');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnIcon = submitBtn.querySelector('.btn-icon');

    // Manejar envío del formulario
    surveyForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Detección de Bots (Honeypot)
        if (document.getElementById('website_verification').value !== "") {
            console.warn('Bot detectado.');
            showSuccessState(); // Engañamos al bot mostrándole un éxito "falso"
            return;
        }

        // 2. Rate Limiting (1 envío cada hora)
        const lastSubmission = localStorage.getItem('antigravity_last_submit');
        const now = Date.now();
        if (lastSubmission && (now - lastSubmission < 3600000)) {
            const minutesLeft = Math.ceil((3600000 - (now - lastSubmission)) / 60000);
            alert(`Para evitar duplicados, solo puedes enviar una encuesta cada hora. Faltan ${minutesLeft} minutos.`);
            return;
        }

        // Use the globally defined submitBtn
        submitBtn.disabled = true;
        btnText.textContent = 'Protegiendo y enviando...'; // Update to use btnText
        btnIcon.textContent = '⚡'; // Keep icon consistent or remove if not needed
        submitBtn.style.opacity = '0.7';

        // Obtener datos del formulario
        const formData = new FormData(surveyForm);
        const data = Object.fromEntries(formData.entries());
        
        // 3. Sanitización de comentarios (Prevención XSS básica)
        if (data.comentarios_adicionales) {
            data.comentarios_adicionales = data.comentarios_adicionales
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
        }

        console.log('Enviando datos seguros a n8n:', data);

        // Realizar envío a n8n
        fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Token': SEC_KEY
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                console.log('Status Code:', response.status);
                if (response.status === 401) {
                    throw new Error('Identificación inválida.');
                }
                if (!response.ok) {
                    throw new Error(`Servidor: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                console.log('Webhook recibido con éxito:', result);
                
                // Guardar tiempo del envío para Rate Limit
                localStorage.setItem('antigravity_last_submit', Date.now());
                
                showSuccessState();
            })
            .catch(error => {
                console.error('DETALLE DEL ERROR:', error);
                
                if (error.message.includes('Failed to fetch')) {
                    alert('ERROR DE CONEXIÓN: Verifica que el flujo de n8n esté PUBLICADO y con CORS activo.');
                } else {
                    alert(`ERROR: ${error.message}`);
                }

                resetSubmitButton();
            });
    });

    function showSuccessState() {
        surveyForm.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        surveyForm.style.opacity = '0';
        surveyForm.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            surveyForm.classList.add('hidden');
            successScreen.classList.remove('hidden');
            surveyForm.reset();
            resetSubmitButton();
        }, 500);
    }

    function resetSubmitButton() {
        // Use the globally defined submitBtn
        submitBtn.disabled = false;
        btnText.textContent = 'Enviar Encuesta'; // Update to use btnText
        btnIcon.textContent = '→'; // Keep icon consistent or remove if not needed
        submitBtn.style.opacity = '1';
    }

    // Reiniciar encuesta
    restartButton.addEventListener('click', () => {
        successScreen.classList.add('hidden');
        surveyForm.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Efecto visual en los radios (Pill Buttons)
    const labels = document.querySelectorAll('.radio-group label');
    labels.forEach(label => {
        label.addEventListener('click', () => {
            label.style.transform = 'scale(0.95)';
            setTimeout(() => label.style.transform = '', 100);
        });
    });
});
