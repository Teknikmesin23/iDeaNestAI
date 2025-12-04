<?php
// Start output buffering to prevent unintended output
ob_start();

// Nonaktifkan tampilan error ke browser, log saja ke file
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'E:/Downloads/XAAMP/htdocs/TextGeneratorAI/php_errors.log');

// Header JSON + CORS (sesuaikan origin dengan port 8080)
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Helper kirim JSON
function send_json_response($data) {
    ob_clean();
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    ob_end_flush();
    exit;
}

// Helper untuk debug ke file log
function debug_log($message) {
    error_log(date('[Y-m-d H:i:s] ') . $message . PHP_EOL, 3, 'E:/Downloads/XAAMP/htdocs/TextGeneratorAI/php_errors.log');
}

// Log request mentah
debug_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
debug_log('Raw POST: ' . print_r($_POST, true));

// Cek method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(['success' => false, 'error' => 'Invalid request method']);
}

// Cek parameter messages
if (!isset($_POST['messages']) || trim($_POST['messages']) === '') {
    send_json_response(['success' => false, 'error' => 'Missing or empty messages parameter']);
}

// Decode messages
$messages = json_decode($_POST['messages'], true);
$max_messages = 10;

if (json_last_error() !== JSON_ERROR_NONE) {
    debug_log('JSON decode error: ' . json_last_error_msg());
    send_json_response(['success' => false, 'error' => 'Invalid JSON format in messages']);
}

if (!is_array($messages)) {
    send_json_response(['success' => false, 'error' => 'Messages must be an array']);
}

if (count($messages) > $max_messages) {
    send_json_response(['success' => false, 'error' => 'Too many messages. Maximum ' . $max_messages . ' allowed']);
}

// Validasi struktur setiap message
foreach ($messages as $i => $message) {
    if (!isset($message['role']) || !isset($message['content'])) {
        send_json_response(['success' => false, 'error' => "Invalid message structure at index $i"]);
    }
    if (!in_array($message['role'], ['user', 'assistant'])) {
        send_json_response(['success' => false, 'error' => "Invalid role at index $i"]);
    }
    if (trim($message['content']) === '') {
        send_json_response(['success' => false, 'error' => "Empty content at index $i"]);
    }
}

// ==== KONFIGURASI OPENROUTER ====

// GANTI DENGAN API KEY BARU KAMU
$api_key = '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';

// Endpoint OpenRouter
$api_url = 'https://openrouter.ai/api/v1/chat/completions';

// Header HTTP untuk cURL
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $api_key,
    'HTTP-Referer: http://localhost:8080/TextGeneratorAI/',
    'X-Title: Lintas AI Text Generator',
];

// Body request ke OpenRouter
$body = [
    'model'       => 'deepseek/deepseek-r1', // model TANPA karakter enter
    'messages'    => $messages,
    'temperature' => 0.7,
    'max_tokens'  => 3000,
];

// ==== KIRIM REQUEST KE OPENROUTER ====

// Inisialisasi cURL
$ch = curl_init($api_url);
if ($ch === false) {
    debug_log('Failed to initialize cURL');
    send_json_response(['success' => false, 'error' => 'Failed to initialize cURL']);
}

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
curl_setopt($ch, CURLOPT_TIMEOUT, 90);

// Eksekusi
$response   = curl_exec($ch);
$http_code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($response === false || $curl_error) {
    debug_log('cURL error: ' . $curl_error);
    send_json_response(['success' => false, 'error' => 'Request failed: ' . $curl_error]);
}

debug_log('Raw API response: ' . $response);

// Decode JSON balasan
$data = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    debug_log('Invalid JSON response from API: ' . json_last_error_msg());
    send_json_response(['success' => false, 'error' => 'Invalid JSON response from API']);
}

if ($http_code !== 200 || !isset($data['choices'][0]['message']['content'])) {
    $err_msg = $data['error']['message'] ?? 'Invalid API response';
    debug_log("API error: HTTP $http_code - $err_msg");
    send_json_response(['success' => false, 'error' => 'API error: ' . $err_msg]);
}

// Ambil teks jawaban
$generated_text = trim($data['choices'][0]['message']['content']);
$generated_text = preg_replace('/\n{2,}/', "\n", $generated_text);
$generated_text = preg_replace('/[\#\-]/', '', $generated_text);

// Kirim balik ke frontend
send_json_response([
    'success' => true,
    'data'    => ['text' => $generated_text],
]);
