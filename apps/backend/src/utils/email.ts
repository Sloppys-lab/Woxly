import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(
  email: string,
  code: string,
  purpose: string = 'Подтверждение email'
): Promise<void> {
  const isPasswordReset = purpose === 'Восстановление пароля';
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@woxly.com',
    to: email,
    subject: `${purpose} - WOXLY`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ffbdd3; font-size: 36px; margin: 0;">WOXLY</h1>
        </div>
        
        <div style="background: #2b2d31; padding: 30px; border-radius: 8px; border: 1px solid #404249;">
          <h2 style="color: #ffffff; margin-top: 0;">${purpose}</h2>
          
          ${isPasswordReset 
            ? '<p style="color: #b9bbbe;">Вы запросили восстановление пароля. Используйте код ниже:</p>' 
            : '<p style="color: #b9bbbe;">Спасибо за регистрацию! Ваш код подтверждения:</p>'
          }
          
          <div style="background: #1e1f22; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <h2 style="color: #ffbdd3; font-size: 42px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${code}</h2>
          </div>
          
          <p style="color: #b9bbbe; font-size: 14px;">
            ${isPasswordReset 
              ? 'Введите этот код в приложении для сброса пароля. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.' 
              : 'Введите этот код в приложении для подтверждения email.'
            }
          </p>
          
          <p style="color: #72767d; font-size: 12px; margin-top: 20px;">
            Код действителен в течение 15 минут.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #72767d; font-size: 12px;">
            © 2024 WOXLY. Все права защищены.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email send error:', error);
    // В продакшене не выбрасываем ошибку, чтобы не блокировать регистрацию
  }
}

