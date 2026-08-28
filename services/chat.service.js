const createDemoReply = (message) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("đơn hàng")) {
    return "Bạn vui lòng cung cấp mã đơn hàng để mình hỗ trợ kiểm tra. Đây là phản hồi demo, chưa kết nối API.";
  }
  if (normalized.includes("đổi trả")) {
    return "Mình có thể giúp bạn tìm hiểu chính sách đổi trả. Đây là phản hồi demo, chưa kết nối API.";
  }
  return "Cảm ơn bạn đã nhắn tin. Chatbox đang ở chế độ demo; hãy cấu hình CHAT_API_URL và CHAT_API_KEY để nhận phản hồi từ API thật.";
};

const extractReply = (data) => {
  return data.reply
    || data.output_text
    || data.answer
    || data.choices?.[0]?.message?.content
    || data.content?.[0]?.text;
};

module.exports.getReply = async ({ message, history }) => {
  const apiUrl = process.env.CHAT_API_URL;
  const apiKey = process.env.CHAT_API_KEY;

  if (!apiUrl) return createDemoReply(message);

  // Adapter API: thay payload/header tại đây nếu nhà cung cấp API của bạn dùng schema khác.
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ message, history }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Chat API returned ${response.status}`);
  }

  const reply = extractReply(data);
  if (!reply) throw new Error("Chat API không trả về nội dung phù hợp.");
  return reply;
};
