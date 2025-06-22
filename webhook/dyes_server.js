const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'your_whatsapp_access_token';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || 'your_phone_number_id';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'DyesBot@2023!';
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Sample product catalog (in a real app, this would come from a database)
const products = {
  'dye-001': {
    id: 'dye-001',
    name: 'Reactive Red 120',
    type: 'Reactive Dye',
    application: 'Cotton, Silk, Wool',
    packaging: '25 kg HDPE drums',
    price: 1250,
    moq: '100 kg',
    cas: '61951-82-4'
  },
  'int-001': {
    id: 'int-001',
    name: 'Benzidine Intermediate',
    type: 'Chemical Intermediate',
    application: 'Dye manufacturing',
    packaging: '200 kg steel drums',
    price: 850,
    moq: '500 kg',
    cas: '92-87-5'
  }
};

// WhatsApp API helper functions
const sendWhatsAppMessage = async (to, message) => {
  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: "whatsapp",
        to: to,
        ...message
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
  }
};

const sendTextMessage = async (to, text) => {
  return sendWhatsAppMessage(to, {
    type: "text",
    text: { body: text }
  });
};

const sendInteractiveMessage = async (to, header, body, buttons) => {
  return sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "button",
      header: { type: "text", text: header },
      body: { text: body },
      action: {
        buttons: buttons.map((btn, index) => ({
          type: "reply",
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    }
  });
};

const sendListMessage = async (to, header, body, sections) => {
  return sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      action: {
        button: "Select Option",
        sections: sections
      }
    }
  });
};

// Main message handler
const handleIncomingMessage = async (from, message) => {
  try {
    const messageText = message.text?.body?.toLowerCase() || 
                     message.interactive?.button_reply?.title?.toLowerCase() ||
                     message.interactive?.list_reply?.title?.toLowerCase() || '';

    // Welcome message and main menu
    if (messageText.includes('hi') || messageText.includes('hello') || 
        messageText.includes('start') || messageText === 'main menu') {
      
      const sections = [{
        title: "Main Options",
        rows: [
          { id: "browse_products", title: "Browse Products", description: "View our range of dyes and intermediates" },
          { id: "search_products", title: "Search Products", description: "Find specific products" },
          { id: "request_quote", title: "Request Quote", description: "Get pricing for bulk orders" },
          { id: "track_order", title: "Track Order", description: "Check status of your order" },
          { id: "contact_support", title: "Contact Support", description: "Talk to our sales team" }
        ]
      }];

      await sendListMessage(from, 
        "🎨 Welcome to Dyes & Intermediates Bot!", 
        "How can I assist you today? Select an option:",
        sections
      );
      return;
    }

    // Handle Browse Products
    if (messageText === 'browse products') {
      const sections = [{
        title: "Product Categories",
        rows: [
          { id: "cat_reactive", title: "Reactive Dyes", description: "For cotton, silk, and wool" },
          { id: "cat_direct", title: "Direct Dyes", description: "For paper and leather" },
          { id: "cat_intermediates", title: "Chemical Intermediates", description: "For dye manufacturing" },
          { id: "cat_specialty", title: "Specialty Chemicals", description: "Custom formulations" }
        ]
      }];
      
      await sendListMessage(from, 
        "🎨 Product Categories", 
        "Select a category to browse products:",
        sections
      );
      return;
    }

    // Handle category selection
    if (messageText.startsWith('cat_')) {
      // In a real app, fetch products by category from database
      const category = messageText.replace('cat_', '');
      const categoryName = {
        'reactive': 'Reactive Dyes',
        'direct': 'Direct Dyes',
        'intermediates': 'Chemical Intermediates',
        'specialty': 'Specialty Chemicals'
      }[category] || 'Products';

      const productList = Object.values(products).filter(p => 
        p.type.toLowerCase().includes(category) || category === 'all'
      );

      if (productList.length === 0) {
        await sendTextMessage(from, `No products found in ${categoryName} category.`);
        return;
      }

      const sections = [{
        title: categoryName,
        rows: productList.slice(0, 10).map(product => ({
          id: `prod_${product.id}`,
          title: product.name,
          description: `${product.type} | ${product.packaging}`
        }))
      }];
      
      await sendListMessage(from, 
        `🎨 ${categoryName}`, 
        `Available ${categoryName.toLowerCase()}. Select a product for details:`,
        sections
      );
      return;
    }

    // Handle product details
    if (messageText.startsWith('prod_')) {
      const productId = messageText.replace('prod_', '');
      const product = products[productId];
      
      if (!product) {
        await sendTextMessage(from, "Product not found.");
        return;
      }
      
      let productInfo = `*${product.name}*
`;
      productInfo += `Type: ${product.type}\n`;
      productInfo += `Application: ${product.application}\n`;
      productInfo += `Packaging: ${product.packaging}\n`;
      productInfo += `MOQ: ${product.moq}\n`;
      productInfo += `Price: ₹${product.price}/kg\n`;
      productInfo += `CAS: ${product.cas}`;
      
      await sendTextMessage(from, productInfo);
      
      // Show action buttons
      await sendInteractiveMessage(from, "Product Actions", "What would you like to do?", [
        { id: `req_quote_${product.id}`, title: "Request Quote" },
        { id: "browse_products", title: "Browse More Products" },
        { id: "main_menu", title: "Main Menu" }
      ]);
      return;
    }

    // Handle quote request
    if (messageText.startsWith('req_quote_') || messageText === 'request quote') {
      let productId = messageText.replace('req_quote_', '');
      
      if (productId === 'request quote') {
        // General quote request
        await sendTextMessage(from, 
          "📝 *Request a Quote*\n\n" +
          "Please provide the following details:\n" +
          "1. Product Name/Code\n" +
          "2. Required Quantity\n" +
          "3. Delivery Location\n" +
          "4. Any special requirements\n\n" +
          "Our sales team will contact you shortly with a quote."
        );
      } else {
        // Quote for specific product
        const product = products[productId];
        if (product) {
          await sendTextMessage(from, 
            `📝 *Quote Request for ${product.name}*\n\n` +
            `Please provide:\n` +
            `1. Required Quantity (Current MOQ: ${product.moq})\n` +
            `2. Delivery Location\n` +
            `3. Any special requirements`
          );
        }
      }
      return;
    }

    // Handle track order
    if (messageText === 'track order') {
      await sendTextMessage(from, 
        "📦 *Track Your Order*\n\n" +
        "Please share your order number or reference ID to check the status."
      );
      return;
    }

    // Handle contact support
    if (messageText === 'contact support') {
      await sendTextMessage(from, 
        "📞 *Contact Our Team*\n\n" +
        "Sales Inquiries:\n" +
        "📧 sales@dyescompany.com\n" +
        "📱 +91 XXXXXXXXXX\n\n" +
        "Technical Support:\n" +
        "📧 support@dyescompany.com\n" +
        "📱 +91 XXXXXXXXXX\n\n" +
        "We're available Mon-Sat, 9:00 AM - 6:00 PM IST"
      );
      
      await sendInteractiveMessage(from, "Quick Actions", "What would you like to do?", [
        { id: "request_callback", title: "Request Callback" },
        { id: "browse_products", title: "Browse Products" },
        { id: "main_menu", title: "Main Menu" }
      ]);
      return;
    }

    // Handle search products
    if (messageText === 'search products') {
      await sendTextMessage(from, 
        "🔍 *Search Products*\n\n" +
        "Please enter the product name, type, or CAS number to search."
      );
      return;
    }

    // Handle search query (simple implementation)
    const searchQuery = messageText.toLowerCase();
    if (searchQuery && searchQuery !== 'hi' && searchQuery !== 'hello') {
      const searchResults = Object.values(products).filter(product => 
        product.name.toLowerCase().includes(searchQuery) ||
        product.type.toLowerCase().includes(searchQuery) ||
        product.cas.includes(searchQuery)
      );

      if (searchResults.length > 0) {
        const sections = [{
          title: "Search Results",
          rows: searchResults.slice(0, 10).map(product => ({
            id: `prod_${product.id}`,
            title: product.name,
            description: `${product.type} | ${product.packaging}`
          }))
        }];
        
        await sendListMessage(from, 
          `🔍 Search Results for "${searchQuery}"`, 
          "Select a product for details:",
          sections
        );
        return;
      } else {
        await sendTextMessage(from, 
          `No products found matching "${searchQuery}".\n\n` +
          "Try searching with different keywords or browse our categories."
        );
      }
    }

    // Default response
    await sendTextMessage(from, 
      "I'm here to help you with our dyes and chemical products. " +
      "Type 'hi' to see the main menu or ask about our products and services."
    );

  } catch (error) {
    console.error('Error handling message:', error);
    await sendTextMessage(from, "Sorry, something went wrong. Please try again later.");
  }
};

// Webhook endpoints
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge);
      return;
    }
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach(async (entry) => {
        const changes = entry.changes;
        
        changes?.forEach(async (change) => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            
            if (messages) {
              for (const message of messages) {
                const from = message.from;
                console.log(`Received message from ${from}:`, message);
                
                await handleIncomingMessage(from, message);
              }
            }
          }
        });
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dyes & Intermediates WhatsApp Bot running on port ${PORT}`);
  console.log('📱 Webhook URL: https://your-domain.com/webhook');
  console.log('🔧 Required environment variables:');
  console.log('   - WHATSAPP_TOKEN');
  console.log('   - WHATSAPP_PHONE_NUMBER_ID'); 
  console.log('   - WEBHOOK_VERIFY_TOKEN');
});

module.exports = app;
