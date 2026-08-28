const chatService = require("../../services/chat.service");

module.exports.reply = async (req, res) => {
  try {
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];

    if (!message) {
      return res.status(400).json({ message: "Vui lòng nhập nội dung tin nhắn." });
    }
    if (message.length > 1000) {
      return res.status(400).json({ message: "Tin nhắn không được vượt quá 1000 ký tự." });
    }

    const reply = await chatService.getReply({ message, history });
    return res.json({ reply });
  } catch (error) {
    console.error("Chat service error:", error.message);
    return res.status(502).json({ message: "Dịch vụ chat tạm thời không khả dụng. Vui lòng thử lại sau." });
  }
};
