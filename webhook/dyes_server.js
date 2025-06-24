const express = require('express');
const axios = require('axios');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Check for required environment variables
function checkRequiredEnvVars() {
  const requiredVars = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WEBHOOK_VERIFY_TOKEN'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using default values for development. DO NOT use in production!');
  }
}

// Call on startup
checkRequiredEnvVars();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logging

// Simple rate limiting middleware
const apiLimiter = (req, res, next) => {
  // This is a basic implementation. For production, use a package like 'express-rate-limit'
  if (!req.app.locals.requestCounts) {
    req.app.locals.requestCounts = {};
  }
  
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // limit each IP to 100 requests per windowMs
  
  if (!req.app.locals.requestCounts[ip]) {
    req.app.locals.requestCounts[ip] = {
      count: 1,
      resetTime: now + windowMs
    };
  } else if (now > req.app.locals.requestCounts[ip].resetTime) {
    req.app.locals.requestCounts[ip] = {
      count: 1,
      resetTime: now + windowMs
    };
  } else {
    req.app.locals.requestCounts[ip].count++;
    if (req.app.locals.requestCounts[ip].count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
  }
  
  next();
};

// Apply rate limiting to API endpoints
app.use('/webhook', apiLimiter);

// Root route
app.get('/', (req, res) => {
  res.send(`
    <h1>Dyes Webhook Service</h1>
    <p>Status: Running</p>
    <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
    <p>Webhook URL: /webhook</p>
    <p>API Status: <a href="/status">Check Status</a></p>
  `);
});

// Status endpoint with detailed information
app.get('/status', (req, res) => {
  const uptime = process.uptime();
  const uptimeFormatted = {
    days: Math.floor(uptime / 86400),
    hours: Math.floor((uptime % 86400) / 3600),
    minutes: Math.floor((uptime % 3600) / 60),
    seconds: Math.floor(uptime % 60)
  };
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: uptimeFormatted,
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    version: process.version,
    webhookConfigured: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  });
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Configuration
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'your_whatsapp_access_token';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || 'your_phone_number_id';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'DyesBot@2023!';
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Sample product catalog (in a real app, this would come from a database)
const products = {
  // Reactive Dyes
  'dye-001': {
    id: 'dye-001',
    name: 'Reactive Red 120',
    type: 'Reactive Dye',
    category: 'reactive',
    application: 'Cotton, Silk, Wool',
    packaging: '25 kg HDPE drums',
    price: 1250,
    moq: '100 kg',
    description: 'High-quality reactive dye with excellent wash fastness and bright shade.',
    cas: '61951-82-4',
    inStock: true
  },
  'dye-002': {
    id: 'dye-002',
    name: 'Reactive Blue 19',
    type: 'Reactive Dye',
    category: 'reactive',
    application: 'Cotton, Silk, Wool',
    packaging: '25 kg HDPE drums',
    price: 1350,
    moq: '100 kg',
    description: 'Brilliant blue reactive dye with high fixation rate and color stability.',
    cas: '2580-78-1',
    inStock: true
  },
  'dye-003': {
    id: 'dye-003',
    name: 'Reactive Yellow 86',
    type: 'Reactive Dye',
    category: 'reactive',
    application: 'Cotton, Silk, Wool',
    packaging: '25 kg HDPE drums',
    price: 1150,
    moq: '100 kg',
    description: 'Vibrant yellow reactive dye with excellent light fastness properties.',
    cas: '61951-86-8',
    inStock: true
  },
  
  // Direct Dyes
  'dye-004': {
    id: 'dye-004',
    name: 'Direct Black 38',
    type: 'Direct Dye',
    category: 'direct',
    application: 'Paper, Leather',
    packaging: '20 kg bags',
    price: 950,
    moq: '80 kg',
    description: 'Deep black direct dye with good light fastness for paper and leather applications.',
    cas: '1937-37-7',
    inStock: true
  },
  'dye-005': {
    id: 'dye-005',
    name: 'Direct Red 81',
    type: 'Direct Dye',
    category: 'direct',
    application: 'Paper, Leather',
    packaging: '20 kg bags',
    price: 1050,
    moq: '80 kg',
    description: 'Bright red direct dye with excellent solubility and even dyeing properties.',
    cas: '2610-11-9',
    inStock: true
  },
  
  // Acid Dyes
  'dye-006': {
    id: 'dye-006',
    name: 'Acid Blue 9',
    type: 'Acid Dye',
    category: 'acid',
    application: 'Nylon, Wool, Silk',
    packaging: '15 kg cartons',
    price: 1550,
    moq: '60 kg',
    description: 'Brilliant blue acid dye for protein fibers with excellent leveling properties.',
    cas: '3844-45-9',
    inStock: true
  },
  'dye-007': {
    id: 'dye-007',
    name: 'Acid Red 52',
    type: 'Acid Dye',
    category: 'acid',
    application: 'Nylon, Wool, Silk',
    packaging: '15 kg cartons',
    price: 1650,
    moq: '60 kg',
    description: 'Bright red acid dye with high tinting strength and good light fastness.',
    cas: '3520-42-1',
    inStock: false
  },
  
  // Intermediates
  'int-001': {
    id: 'int-001',
    name: 'H-Acid',
    type: 'Dye Intermediate',
    category: 'intermediate',
    application: 'Manufacturing of acid and reactive dyes',
    packaging: '25 kg fiber drums',
    price: 2250,
    moq: '100 kg',
    description: 'Key intermediate for synthesis of various acid and reactive dyes.',
    cas: '90-20-0',
    inStock: true
  },
  'int-002': {
    id: 'int-002',
    name: 'J-Acid',
    type: 'Dye Intermediate',
    category: 'intermediate',
    application: 'Manufacturing of acid and reactive dyes',
    packaging: '25 kg fiber drums',
    price: 2150,
    moq: '100 kg',
    description: 'Essential intermediate for production of blue and navy dyes.',
    cas: '92-70-6',
    inStock: true
  },
  'int-003': {
    id: 'int-003',
    name: 'Benzidine Intermediate',
    type: 'Chemical Intermediate',
    category: 'intermediate',
    application: 'Dye manufacturing',
    packaging: '200 kg steel drums',
    price: 850,
    moq: '500 kg',
    description: 'Used in the synthesis of direct dyes.',
    cas: '92-87-5',
    inStock: true
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

// User session tracking (in a real app, this would be in a database)
const userSessions = {};

// Helper function to get product categories
const getProductCategories = () => {
  const categories = {};
  Object.values(products).forEach(product => {
    if (!categories[product.category]) {
      categories[product.category] = {
        name: product.category.charAt(0).toUpperCase() + product.category.slice(1),
        description: product.type
      };
    }
  });
  return categories;
};

// Helper function to get products by category
const getProductsByCategory = (category) => {
  return Object.values(products).filter(product => product.category === category);
};

// Helper function to format product details
const formatProductDetails = (product) => {
  return `*${product.name}*\n\n` +
    `*Type:* ${product.type}\n` +
    `*Application:* ${product.application}\n` +
    `*Packaging:* ${product.packaging}\n` +
    `*Price:* $${product.price} per unit\n` +
    `*MOQ:* ${product.moq}\n` +
    `*CAS:* ${product.cas}\n` +
    `*Availability:* ${product.inStock ? '✅ In Stock' : '❌ Out of Stock'}\n\n` +
    `*Description:* ${product.description}`;
};

// Main message handler
const handleIncomingMessage = async (from, message) => {
  try {
    // Initialize user session if it doesn't exist
    if (!userSessions[from]) {
      userSessions[from] = {
        lastInteraction: Date.now(),
        context: 'welcome',
        cart: [],
        lastProductViewed: null
      };
    } else {
      // Update last interaction time
      userSessions[from].lastInteraction = Date.now();
    }
    
    const session = userSessions[from];
    
    const messageText = message.text?.body?.toLowerCase() || 
                     message.interactive?.button_reply?.id?.toLowerCase() ||
                     message.interactive?.list_reply?.id?.toLowerCase() || '';
    
    console.log(`Received message from ${from}: ${messageText}`);
    console.log(`User context: ${session.context}`);

    // Reset command
    if (messageText === 'reset' || messageText === 'restart') {
      session.context = 'welcome';
      await sendTextMessage(from, "I've reset our conversation. How can I help you today?");
      return sendWelcomeMenu(from);
    }

    // Welcome message and main menu
    if (messageText.includes('hi') || messageText.includes('hello') || 
        messageText.includes('start') || messageText === 'main_menu' || session.context === 'welcome') {
      
      return sendWelcomeMenu(from);
    }
    
    // Handle main menu selections
    console.log(`Before context change - messageText: ${messageText}, current context: ${session.context}`);
    if (messageText === 'browse_products') {
      // Update the session context
      session.context = 'browsing_categories';
      // Explicitly save the updated session back to userSessions
      userSessions[from] = { ...session };
      console.log(`After context change - new context: ${session.context}`);
      return sendCategoryMenu(from);
    }
    
    // Handle category selection
    if (session.context === 'browsing_categories') {
      if (messageText.startsWith('category_')) {
        const category = messageText.replace('category_', '');
        session.context = 'browsing_products';
        session.currentCategory = category;
        return sendProductListByCategory(from, category);
      }
    }
    
    // Handle product selection
    if (session.context === 'browsing_products') {
      if (messageText.startsWith('product_')) {
        const productId = messageText.replace('product_', '');
        const product = products[productId];
        if (product) {
          session.context = 'viewing_product';
          session.lastProductViewed = productId;
          return sendProductDetails(from, product);
        }
      } else if (messageText === 'back_to_categories') {
        session.context = 'browsing_categories';
        return sendCategoryMenu(from);
      }
    }
    
    // Handle product detail actions
    if (session.context === 'viewing_product') {
      if (messageText === 'add_to_cart') {
        if (session.lastProductViewed) {
          const product = products[session.lastProductViewed];
          if (product) {
            // Check if product is already in cart
            const existingItem = session.cart.find(item => item.id === product.id);
            if (existingItem) {
              existingItem.quantity += 1;
            } else {
              session.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
              });
            }
            await sendTextMessage(from, `Added ${product.name} to your cart.`);
            return sendProductActionButtons(from, 'view_cart');
          }
        }
      } else if (messageText === 'request_quote') {
        session.context = 'requesting_quote';
        return sendTextMessage(from, "Please provide your contact details and quantity requirements, and our sales team will get back to you with a quote within 24 hours.");
      } else if (messageText === 'back_to_products') {
        session.context = 'browsing_products';
        return sendProductListByCategory(from, session.currentCategory);
      } else if (messageText === 'view_cart') {
        return sendCartSummary(from);
      }
    }
    
    // Handle cart actions
    if (messageText === 'view_cart') {
      return sendCartSummary(from);
    } else if (messageText === 'checkout') {
      if (session.cart.length > 0) {
        session.context = 'checkout';
        return sendTextMessage(from, "Please provide your shipping details (name, address, email) to proceed with your order.");
      } else {
        await sendTextMessage(from, "Your cart is empty. Browse our products to add items to your cart.");
        return sendWelcomeMenu(from);
      }
    } else if (messageText === 'clear_cart') {
      session.cart = [];
      await sendTextMessage(from, "Your cart has been cleared.");
      return sendWelcomeMenu(from);
    } else if (messageText === 'continue_shopping') {
      session.context = 'browsing_categories';
      return sendCategoryMenu(from);
    }
    
    // Handle search products
    if (messageText === 'search_products') {
      session.context = 'searching';
      return sendTextMessage(from, "Please type the name or type of product you're looking for.");
    }
    
    // Handle search query
    if (session.context === 'searching') {
      const searchResults = Object.values(products).filter(product => 
        product.name.toLowerCase().includes(messageText) || 
        product.type.toLowerCase().includes(messageText) ||
        (product.description && product.description.toLowerCase().includes(messageText))
      );
      
      if (searchResults.length > 0) {
        await sendTextMessage(from, `Found ${searchResults.length} products matching your search:`);
        return sendSearchResults(from, searchResults);
      } else {
        await sendTextMessage(from, "No products found matching your search. Please try different keywords.");
        return sendWelcomeMenu(from);
      }
    }
    
    // Handle direct search query (when user types a product name directly)
    if (messageText && messageText !== 'hi' && messageText !== 'hello') {
      const searchResults = Object.values(products).filter(product => 
        product.name.toLowerCase().includes(messageText) ||
        product.type.toLowerCase().includes(messageText) ||
        (product.cas && product.cas.includes(messageText))
      );

      if (searchResults.length > 0) {
        await sendTextMessage(from, `Found ${searchResults.length} products matching your search:`);
        return sendSearchResults(from, searchResults);
      }
    }
    
    // Handle contact support
    if (messageText === 'contact_support') {
      session.context = 'contacting_support';
      const buttons = [
        { id: "sales_inquiry", title: "Sales Inquiry" },
        { id: "technical_support", title: "Technical Support" },
        { id: "main_menu", title: "Back to Main Menu" }
      ];
      return sendInteractiveMessage(from, "Contact Support", "How can our team help you today?", buttons);
    }
    
    // Handle support options
    if (session.context === 'contacting_support') {
      if (messageText === 'sales_inquiry') {
        await sendTextMessage(from, "Please provide details about your inquiry and our sales team will contact you within 24 hours. You can also reach us at sales@dyescompany.com or +1-555-123-4567.");
        return sendWelcomeMenu(from);
      } else if (messageText === 'technical_support') {
        await sendTextMessage(from, "For technical assistance with our products, please describe your issue in detail. Our technical team will respond within 48 hours. For urgent matters, call our technical hotline at +1-555-987-6543.");
        return sendWelcomeMenu(from);
      }
    }
    
    // Handle track order
    if (messageText === 'track_order') {
      session.context = 'tracking_order';
      return sendTextMessage(from, "Please enter your order number to track its status.");
    }
    
    // Handle order tracking input
    if (session.context === 'tracking_order') {
      // Simulate order tracking
      const orderStatuses = ['Processing', 'Shipped', 'Delivered', 'On Hold'];
      const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 10) + 1);
      
      await sendTextMessage(from, `Order #${messageText}\n\nStatus: ${randomStatus}\nEstimated Delivery: ${estimatedDelivery.toDateString()}\n\nThank you for your business!`);
      return sendWelcomeMenu(from);
    }
    
    // Handle request quote
    if (messageText === 'request_quote') {
      session.context = 'requesting_quote';
      return sendTextMessage(from, "Please provide the following information for a quote:\n\n1. Product name/code\n2. Quantity required\n3. Delivery location\n4. Your contact information\n\nOur team will prepare a custom quote for you within 24 hours.");
    }
    
    // Default response if no patterns match
    if (session.context === 'welcome' || !session.context) {
      return sendWelcomeMenu(from);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await sendTextMessage(from, "I'm sorry, I encountered an error processing your request. Please try again later.");
  }
};

// Helper function to send welcome menu
const sendWelcomeMenu = async (from) => {
  await sendTextMessage(from, "Welcome to Dyes & Intermediates Bot! How can I assist you today? Select an option:");
  
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

  return sendListMessage(from, 
    "🎨 Welcome to Dyes & Intermediates Bot!", 
    "How can I assist you today? Select an option:",
    sections
  );
};

// Helper function to send category menu
const sendCategoryMenu = async (from) => {
  const categories = getProductCategories();
  const rows = Object.entries(categories).map(([key, value]) => ({
    id: `category_${key}`,
    title: value.name,
    description: value.description
  }));
  
  const sections = [{
    title: "Product Categories",
    rows: rows
  }];
  
  return sendListMessage(from, 
    "Product Categories", 
    "Select a category to browse products:",
    sections
  );
};

// Helper function to send product list by category
const sendProductListByCategory = async (from, category) => {
  const categoryProducts = getProductsByCategory(category);
  
  if (categoryProducts.length === 0) {
    await sendTextMessage(from, "No products found in this category.");
    return sendCategoryMenu(from);
  }
  
  const rows = categoryProducts.map(product => ({
    id: `product_${product.id}`,
    title: product.name,
    description: `${product.type} - ${product.inStock ? 'In Stock' : 'Out of Stock'}`
  }));
  
  // Add back button
  rows.push({
    id: "back_to_categories",
    title: "Back to Categories",
    description: "Return to category list"
  });
  
  const sections = [{
    title: "Products",
    rows: rows
  }];
  
  return sendListMessage(from, 
    categoryProducts[0].type, 
    "Select a product to view details:",
    sections
  );
};

// Helper function to send product details
const sendProductDetails = async (from, product) => {
  await sendTextMessage(from, formatProductDetails(product));
  return sendProductActionButtons(from);
};

// Helper function to send product action buttons
const sendProductActionButtons = async (from, additionalAction = null) => {
  const buttons = [
    { id: "add_to_cart", title: "Add to Cart" },
    { id: "request_quote", title: "Request Quote" },
    { id: "back_to_products", title: "Back to Products" }
  ];
  
  if (additionalAction === 'view_cart') {
    buttons.push({ id: "view_cart", title: "View Cart" });
  }
  
  return sendInteractiveMessage(from, 
    "Product Actions", 
    "What would you like to do next?",
    buttons
  );
};

// Helper function to send cart summary
const sendCartSummary = async (from) => {
  const session = userSessions[from];
  
  if (!session.cart || session.cart.length === 0) {
    await sendTextMessage(from, "Your cart is empty.");
    return sendWelcomeMenu(from);
  }
  
  let cartText = "*Your Cart*\n\n";
  let total = 0;
  
  session.cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    cartText += `${index + 1}. ${item.name} x ${item.quantity} = $${itemTotal}\n`;
  });
  
  cartText += `\n*Total: $${total}*`;
  
  await sendTextMessage(from, cartText);
  
  const buttons = [
    { id: "checkout", title: "Checkout" },
    { id: "clear_cart", title: "Clear Cart" },
    { id: "continue_shopping", title: "Continue Shopping" }
  ];
  
  return sendInteractiveMessage(from, 
    "Cart Actions", 
    "What would you like to do next?",
    buttons
  );
};

// Helper function to send search results
const sendSearchResults = async (from, results) => {
  if (results.length > 10) {
    results = results.slice(0, 10); // Limit to 10 results
  }
  
  const rows = results.map(product => ({
    id: `product_${product.id}`,
    title: product.name,
    description: `${product.type} - ${product.inStock ? 'In Stock' : 'Out of Stock'}`
  }));
  
  // Add back button
  rows.push({
    id: "main_menu",
    title: "Back to Main Menu",
    description: "Return to main menu"
  });
  
  const sections = [{
    title: "Search Results",
    rows: rows
  }];
  
  return sendListMessage(from, 
    "Search Results", 
    "Select a product to view details:",
    sections
  );
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

// Webhook endpoints
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

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message 
  });
});

// Start server
const server = app.listen(PORT, () => {
  const actualPort = server.address().port;
  console.log(`🚀 Dyes & Intermediates WhatsApp Bot running on port ${actualPort}`);
  console.log(`📱 Webhook URL: ${process.env.PUBLIC_URL || 'https://your-domain.com'}/webhook`);
  console.log('🔧 Required environment variables:');
  console.log('   - WHATSAPP_TOKEN');
  console.log('   - WHATSAPP_PHONE_NUMBER_ID'); 
  console.log('   - WEBHOOK_VERIFY_TOKEN');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
