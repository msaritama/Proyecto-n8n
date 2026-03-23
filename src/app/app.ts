import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  readonly WEBHOOK_URL = 'https://msaritama.app.n8n.cloud/webhook/7fa92e4c-f06c-4440-9c81-95cf7e902174';
  readonly SEC_KEY = 'n8n_test_webhook';
  
  isSuccess = signal(false);
  isSubmitting = signal(false);

  surveyForm = this.fb.group({
    id_estudiante: ['', Validators.required],
    nivel_satisfaccion: ['', Validators.required],
    claridad_contenido: ['', Validators.required],
    aplicabilidad_practica: ['', Validators.required],
    comentarios_adicionales: [''],
    website_verification: [''] // Honeypot
  });

  submitForm() {
    if (this.surveyForm.invalid) return;

    const values = this.surveyForm.value as Record<string, string>;

    // Honeypot check
    if (values['website_verification'] !== "") {
      console.warn('Bot detectado.');
      this.showSuccess();
      return;
    }

    // Rate Limiting
    const lastSubmission = localStorage.getItem('antigravity_last_submit');
    const now = Date.now();
    if (lastSubmission && (now - Number(lastSubmission) < 3600000)) {
      const minutesLeft = Math.ceil((3600000 - (now - Number(lastSubmission))) / 60000);
      alert(`Para evitar duplicados, solo puedes enviar una encuesta cada hora. Faltan ${minutesLeft} minutos.`);
      return;
    }

    this.isSubmitting.set(true);

    // Sanitize
    let comentarios = values['comentarios_adicionales'] || '';
    comentarios = comentarios.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    const payload: Record<string, any> = {
      ...values,
      comentarios_adicionales: comentarios
    };
    
    delete payload['website_verification']; // remove honeypot before sending

    this.http.post(this.WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Token': this.SEC_KEY
      }
    }).subscribe({
      next: () => {
        localStorage.setItem('antigravity_last_submit', Date.now().toString());
        this.showSuccess();
      },
      error: (err) => {
        console.error('DETALLE DEL ERROR:', err);
        if (err.status === 401) {
          alert('Error: Identificación inválida.');
        } else if (err.status === 0) {
          alert('ERROR DE CONEXIÓN: Verifica que el flujo de n8n esté PUBLICADO y con CORS activo.');
        } else {
          alert(`ERROR: ${err.message || 'Error en el servidor'}`);
        }
        this.isSubmitting.set(false);
      }
    });
  }

  showSuccess() {
    this.isSuccess.set(true);
    this.isSubmitting.set(false);
    this.surveyForm.reset();
  }

  restart() {
    this.isSuccess.set(false);
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }
}
