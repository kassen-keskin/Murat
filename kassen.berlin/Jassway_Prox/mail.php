<?php
// Erlaubt das Verarbeiten des JSON Payloads
header('Content-Type: application/json');

// Eingelesenes JSON decodieren
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Keine Daten empfangen.']);
    exit;
}

// Empfängeradresse
$to = "info@kassen-keskin.de";
$subject = "Neue Mietanfrage: " . $data['plan'];

// Nachricht zusammenstellen
$message = "Guten Tag,\n\n";
$message .= "es wurde eine neue Mietanfrage über die Webseite eingereicht.\n\n";

$message .= "--- BESTELLÜBERSICHT ---\n";
$message .= "Tarif: " . $data['plan'] . "\n";
$message .= "Monatliche Kosten: " . number_format($data['totalMonthly'], 2, ',', '.') . " EUR\n";
$message .= "Einmalige Kosten: " . number_format($data['totalSetup'], 2, ',', '.') . " EUR\n\n";

$message .= "Zusätzliche Optionen:\n";
if (empty($data['hardware'])) {
    $message .= "- Keine zusätzlichen Optionen ausgewählt.\n";
} else {
    foreach($data['hardware'] as $hw) {
        $message .= "- " . $hw['name'] . " (" . number_format($hw['price'], 2, ',', '.') . " EUR)\n";
    }
}
$message .= "\n";

$message .= "--- KUNDEN- UND KONTAKTDATEN ---\n";
$message .= "Firma: " . $data['customer']['company'] . "\n";
$message .= "Name: " . $data['customer']['firstName'] . " " . $data['customer']['lastName'] . "\n";
$message .= "E-Mail: " . $data['customer']['email'] . "\n";
$message .= "Telefon: " . $data['customer']['phone'] . "\n";

// Header für Mail
$headers = "From: webseite@kassen-keskin.de\r\n";
$headers .= "Reply-To: " . $data['customer']['email'] . "\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Mail versenden
if (mail($to, $subject, $message, $headers)) {
    echo json_encode(['success' => true, 'message' => 'Email erfolgreich gesendet.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Der Mail-Server konnte die Nachricht nicht versenden.']);
}
?>
