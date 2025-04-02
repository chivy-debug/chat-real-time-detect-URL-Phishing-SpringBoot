package com.jts.websocket.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.*;

import java.io.UnsupportedEncodingException;

@RestController
@RequestMapping("/api")
public class PhishingAlertController {

    private final JavaMailSender javaMailSender;

    @Autowired
    public PhishingAlertController(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    @PostMapping("/sendPhishingAlert")
    public ResponseEntity<String> sendPhishingAlert(@RequestBody PhishingAlertRequest request) throws MessagingException, UnsupportedEncodingException {
        System.out.println(request);

        // Tạo đối tượng email với thông tin gửi email và tên người gửi
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        // Đặt tên người gửi và các thông tin khác
        helper.setFrom("chivy8912@gmail.com", "Đội ngũ hỗ trợ");
        helper.setTo(request.getEmail());
        helper.setSubject("Hạn chế gửi URL lạ");

        // Cấu trúc nội dung email
        String emailBody =
                "Kính gửi người dùng,\n\n" +
                        "Chúng tôi phát hiện bạn đã gửi một URL có khả năng lừa đảo: " + request.getUrl() + "\n\n" +
                        "Vui lòng lưu ý rằng việc gửi URL lạ hoặc có dấu hiệu lừa đảo có thể gây nguy hiểm cho cộng đồng người dùng. Nếu bạn tiếp tục gửi những URL này, tài khoản của bạn sẽ bị xem xét và có thể bị xóa khỏi nhóm sau 3 lần vi phạm.\n\n" +
                        "Chúng tôi khuyến khích bạn tuân thủ các quy định và bảo vệ an toàn cho tất cả người dùng.\n\n" +
                        "Trân trọng,\n" +
                        "Đội ngũ hỗ trợ\n" +
                        "Đội ngũ hỗ trợ";

        helper.setText(emailBody);

        // Gửi email
        javaMailSender.send(message);

        return ResponseEntity.ok("Phishing alert email sent.");
    }

    public static class PhishingAlertRequest {
        private String email;
        private String url;

        // Getters and setters
        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        @Override
        public String toString() {
            return "PhishingAlertRequest{" +
                    "email='" + email + '\'' +
                    ", url='" + url + '\'' +
                    '}';
        }
    }
}
