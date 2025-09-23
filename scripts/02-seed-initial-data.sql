-- Seed initial data for LaundryPro

-- Insert default business settings
INSERT INTO business_settings (business_name, business_type, address, phone, email) 
VALUES ('LaundryPro', 'laundry', 'İstanbul, Türkiye', '+90 212 555 0123', 'info@laundrypro.com');

-- Insert default admin user
INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
VALUES ('admin@laundrypro.com', '$2b$10$example_hash', 'Admin', 'User', '+90 555 123 4567', 'admin');

-- Insert default services
INSERT INTO services (name, description, base_price, unit, category) VALUES
('Gömlek Yıkama', 'Profesyonel gömlek yıkama ve ütüleme', 15.00, 'piece', 'Kıyafet'),
('Takım Elbise Kuru Temizleme', 'Takım elbise kuru temizleme', 45.00, 'piece', 'Kıyafet'),
('Elbise Yıkama', 'Elbise yıkama ve ütüleme', 25.00, 'piece', 'Kıyafet'),
('Halı Yıkama', 'Halı derin temizlik', 8.00, 'sqm', 'Ev Tekstili'),
('Perde Yıkama', 'Perde yıkama ve ütüleme', 12.00, 'sqm', 'Ev Tekstili'),
('Yorgan Yıkama', 'Yorgan profesyonel yıkama', 35.00, 'piece', 'Ev Tekstili'),
('Ayakkabı Temizleme', 'Ayakkabı temizlik ve bakım', 20.00, 'piece', 'Aksesuar'),
('Çanta Temizleme', 'Deri/kumaş çanta temizleme', 30.00, 'piece', 'Aksesuar');

-- Insert notification templates
INSERT INTO notification_templates (name, type, trigger_event, subject, template_content) VALUES
('Sipariş Onayı - Email', 'email', 'order_confirmed', 'Siparişiniz Onaylandı - #{order_number}', 
'Merhaba #{customer_name},

Siparişiniz başarıyla onaylanmıştır.

Sipariş No: #{order_number}
Toplam Tutar: #{total_amount} TL
Teslim Tarihi: #{delivery_date}

Teşekkür ederiz,
LaundryPro Ekibi'),

('Sipariş Onayı - SMS', 'sms', 'order_confirmed', '', 
'LaundryPro: Siparişiniz onaylandı. Sipariş No: #{order_number}. Teslim: #{delivery_date}. Bilgi: 0212 555 0123'),

('Hazır - Email', 'email', 'ready_for_delivery', 'Siparişiniz Hazır - #{order_number}', 
'Merhaba #{customer_name},

Siparişiniz hazır! Teslimat için sizinle iletişime geçeceğiz.

Sipariş No: #{order_number}
Teslimat Adresi: #{delivery_address}

LaundryPro Ekibi'),

('Hazır - SMS', 'sms', 'ready_for_delivery', '', 
'LaundryPro: Siparişiniz hazır! #{order_number}. Teslimat için arayacağız. Tel: 0212 555 0123'),

('Teslim Edildi - Email', 'email', 'delivered', 'Siparişiniz Teslim Edildi - #{order_number}', 
'Merhaba #{customer_name},

Siparişiniz başarıyla teslim edilmiştir.

Sipariş No: #{order_number}
Teslim Tarihi: #{delivery_date}

Hizmetimizden memnun kaldıysanız, bizi tavsiye etmeyi unutmayın!

LaundryPro Ekibi');

-- Insert sample customers
INSERT INTO customers (first_name, last_name, email, phone, whatsapp, address, latitude, longitude) VALUES
('Ahmet', 'Yılmaz', 'ahmet@email.com', '+90 532 123 4567', '+90 532 123 4567', 'Beşiktaş, İstanbul', 41.0428, 29.0094),
('Fatma', 'Kaya', 'fatma@email.com', '+90 533 234 5678', '+90 533 234 5678', 'Kadıköy, İstanbul', 40.9833, 29.0167),
('Mehmet', 'Demir', 'mehmet@email.com', '+90 534 345 6789', '+90 534 345 6789', 'Şişli, İstanbul', 41.0602, 28.9887);
