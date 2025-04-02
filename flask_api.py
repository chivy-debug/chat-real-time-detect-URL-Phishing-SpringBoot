from flask import Flask, request, jsonify
import pandas as pd
from urllib.parse import urlparse
import re
from joblib import load
import os
import gdown
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins="http://localhost:8080")


# Download file model AI
class PhishingDetector:
    def __init__(self):
        self.drive_file_id = "1BYXfaKmi6wotW3NvhuX5EyLoBi8sq_1j"
        self.local_model_path = "phishing_model.pkl"
        self.download_model()
        self.model = load(self.local_model_path)

    def download_model(self):
        if not os.path.exists(self.local_model_path):
            url = f"https://drive.google.com/uc?id={self.drive_file_id}"
            gdown.download(url, self.local_model_path, quiet=False)

    # Hàm rút trích đặc trưng từ URL
    def extract_features(self, url):
        features = []

        if isinstance(url, str):
            # Phân tích URL
            parsed_url = urlparse(url)
            hostname = parsed_url.hostname if parsed_url.hostname else ''

            # 1. Độ dài của URL
            features.append(len(url))

            # 2. Độ dài của hostname
            features.append(len(hostname))

            # 3. Địa chỉ IP trong URL
            features.append(1 if re.search(r'\d+\.\d+\.\d+\.\d+', url) else 0)

            # 4-18. Tổng số ký tự đặc biệt trong URL (từ . đến $)
            special_chars = ['.', '-', '@', '?', '&', '=', '_', '~', '%',
                             '/', '*', ':', ',', ';', '$']
            for char in special_chars:
                features.append(len(re.findall(re.escape(char), url)))

            # 19. Số lần xuất hiện 'www'
            features.append(url.count('www'))

            # 20. Số lần xuất hiện '.com'
            features.append(url.count('.com'))

            # 21. HTTPS trong URL
            features.append(1 if 'https' in url else 0)

            # 22. Tỉ lệ ký tự số trong URL
            digits = sum(c.isdigit() for c in url)
            features.append(digits / len(url) if len(url) > 0 else 0)

            # 23. Tỉ lệ ký tự số trong hostname
            digits_in_host = sum(c.isdigit() for c in hostname)
            features.append(digits_in_host / len(hostname) if len(hostname) > 0 else 0)

            # 24. Số lượng subdomain
            subdomain_count = len(hostname.split('.')) - 2 if hostname else 0
            features.append(subdomain_count)

            # 25. Độ dài từ ngắn nhất trong hostname
            words_in_host = re.split(r'[\.-]', hostname)
            shortest_word_host = min([len(word) for word in words_in_host if word]) if words_in_host else 0
            features.append(shortest_word_host)

            # 26. Độ dài từ dài nhất trong hostname
            longest_word_host = max([len(word) for word in words_in_host if word]) if words_in_host else 0
            features.append(longest_word_host)

            # 27. Độ dài từ trung bình trong hostname
            avg_word_host = sum([len(word) for word in words_in_host]) / len(words_in_host) if words_in_host else 0
            features.append(avg_word_host)

            # 28. URL sử dụng tên miền rút gọn
            shorteners = ['bit.ly', 'goo.gl', 'tinyurl', 'ow.ly', 'is.gd']
            features.append(1 if any(shortener in url for shortener in shorteners) else 0)

            # 29. URL chứa địa chỉ email
            features.append(1 if re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', url) else 0)

            # 30. Tỉ lệ ký tự chữ cái trong URL
            letters = sum(c.isalpha() for c in url)
            features.append(letters / len(url) if len(url) > 0 else 0)

            # 31. Số lượng từ trong URL
            words_in_url = len(re.findall(r'\w+', url))
            features.append(words_in_url)

            # 32. Độ dài của phần path
            path = parsed_url.path
            features.append(len(path))

            # 33. Số lượng ký tự trong path
            features.append(len(re.findall(r'\w+', path)))

            # 34. URL chứa domain đáng ngờ
            suspicious_domains = ['login', 'secure', 'account', 'verify', 'update',
                                  'authentication', 'confirmation', 'validation',
                                  'security-check', 'identity-verify']
            features.append(1 if any(domain in url for domain in suspicious_domains) else 0)

            # 35. Tỉ lệ ký tự số trong path
            digits_in_path = sum(c.isdigit() for c in path)
            features.append(digits_in_path / len(path) if len(path) > 0 else 0)

            # 36. Số lượng dấu '/' trong path
            features.append(path.count('/'))

            # 37. URL sử dụng TLD không phổ biến
            uncommon_tlds = ['xyz', 'top', 'click', 'online', 'icu', 'info',
                             'tk', 'ga', 'cf', 'ml', 'gq', 'loan', 'win',
                             'shop', 'site', 'us', 'pw']
            tld = hostname.split('.')[-1] if hostname else ''
            features.append(1 if tld in uncommon_tlds else 0)

            # 38. Số lượng tham số trong query
            query = parsed_url.query
            features.append(len(query.split('&')) if query else 0)

            # 39. Độ dài của phần query
            features.append(len(query) if query else 0)

            # 40. Query có chứa ký tự đặc biệt đáng ngờ không
            suspicious_query_chars = ['%20', '%22', '%27', '%3C', '%3E']
            features.append(1 if any(char in query for char in suspicious_query_chars) else 0)

            # 41. Tên miền chứa thương hiệu phổ biến
            trusted_domains = ['facebook.com', 'google.com', 'paypal.com', 'amazon.com',
                               'microsoft.com', 'apple.com', 'linkedin.com', 'twitter.com',
                               'netflix.com', 'bank.com', 'creditcard.com']
            features.append(1 if any(
                brand in hostname and hostname not in trusted_domains
                for brand in trusted_domains
            ) else 0)

            # 42. Tổng độ dài các subdomain
            subdomains = hostname.split('.')[:-2] if hostname else []
            features.append(sum(len(sub) for sub in subdomains))

            # 43. Subdomain đáng ngờ
            suspicious_subdomains = ['login', 'secure', 'account', 'auth', 'verify',
                                     'security', 'validation', 'confirm', 'admin']
            features.append(1 if any(sub in subdomains for sub in suspicious_subdomains) else 0)

            # 44. Tỉ lệ dấu '/' trong URL
            features.append(url.count('/') / len(url) if len(url) > 0 else 0)

            # 45. Path chứa từ khóa đáng ngờ
            suspicious_path_keywords = ['reset', 'confirm', 'admin', 'auth',
                                        'login', 'account', 'password',
                                        'recover', 'verification', 'update-credentials']
            features.append(1 if any(keyword in path for keyword in suspicious_path_keywords) else 0)

            # 46. Hostname chứa ký tự đặc biệt
            features.append(1 if any(char in hostname for char in ['_', '~', '$']) else 0)

            # 47. Tỉ lệ từ ngắn bất thường trong hostname
            invalid_words_in_host = [word for word in words_in_host if len(word) < 3]
            features.append(len(invalid_words_in_host) / len(words_in_host) if words_in_host else 0)

            # 48. Số lượng dấu '.' trong hostname
            features.append(hostname.count('.'))

            # 49. HTTPS trong hostname nhưng URL không bắt đầu bằng HTTPS
            features.append(1 if 'https' in hostname and not url.startswith('https') else 0)

            # 50. Độ dài của TLD
            features.append(len(tld))

            # 51. Query kết thúc bằng ký tự không hợp lệ
            features.append(1 if re.search(r'=[&]*$', query) else 0)

            # 52. Dấu hiệu chuyển hướng đáng ngờ
            features.append(1 if 'http://' in query or 'http://' in path else 0)

            # 53. Kiểm tra URL có chứa từ khóa không tin cậy trong phần path
            untrusted_path_keywords = ['fake', 'fraud', 'phishing', 'malware']
            features.append(1 if any(keyword in path for keyword in untrusted_path_keywords) else 0)

            # 54. Số lượng ký tự hoa trong URL (Kiểm tra xem URL có sử dụng nhiều chữ cái in hoa không)
            uppercase_count = sum(1 for c in url if c.isupper())
            features.append(uppercase_count)

            # 55. Tỉ lệ ký tự in hoa so với tổng ký tự trong URL
            features.append(uppercase_count / len(url) if len(url) > 0 else 0)

            # 56. Độ dài phần fragment (phần sau dấu '#')
            fragment = parsed_url.fragment
            features.append(len(fragment) if fragment else 0)

            # 57. URL có chứa từ khóa đáng ngờ trong fragment không
            suspicious_fragment_keywords = ['reset', 'confirm', 'secure', 'auth']
            features.append(1 if any(keyword in fragment for keyword in suspicious_fragment_keywords) else 0)

            # 58. Mã hóa đáng ngờ
            suspicious_encodings = ['%00', '%3A', '%2F', '%2E', '%5C']
            features.append(1 if any(encoding in url for encoding in suspicious_encodings) else 0)

            # 59. Ký tự lặp lại bất thường
            features.append(1 if re.search(r'\.\.\.\.|----', url) else 0)

            # 60. Tên miền quốc gia không phổ biến
            uncommon_ccTLDs = ['.tk', '.ga', '.cf', '.ml', '.gq']
            features.append(1 if any(tld.endswith(ccTLD) for ccTLD in uncommon_ccTLDs) else 0)

            # 61. Ký tự đặc biệt bất thường trong hostname
            special_chars_in_host = ['%', '$', '^', '&', '*', '(', ')', '=', '+', '#']
            features.append(sum(hostname.count(char) for char in special_chars_in_host))

            # 62. Từ khóa bảo mật trong bối cảnh đáng ngờ
            suspicious_security_keywords = ['secure', 'ssl', 'certified']
            features.append(1 if any(
                keyword in hostname and hostname not in trusted_domains
                for keyword in suspicious_security_keywords
            ) else 0)

            # 63. Độ dài URL bất thường
            features.append(1 if len(url) < 15 or len(url) > 200 else 0)

            # 64. Chuỗi giống mã trong hostname
            random_string_pattern = r'[a-zA-Z0-9]{10,}'
            features.append(1 if re.search(random_string_pattern, hostname) else 0)

        else:
            features = [0] * 64  # Nếu URL không hợp lệ, điền toàn bộ bằng 0

        return features

    def analyze(self, url):
        if not isinstance(url, str):
            return False
        features = self.extract_features(url)
        return bool(self.model.predict(pd.DataFrame([features]))[0])


detector = PhishingDetector()


@app.route('/analyze', methods=['POST'])
def analyze_url():
    data = request.get_json()
    url = data.get('url')

    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        is_phishing = detector.analyze(url)
        return jsonify({
            'url': url,
            'is_phishing': is_phishing,
            'message': 'This URL is phishing' if is_phishing else 'This URL is safe'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
