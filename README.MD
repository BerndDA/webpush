# Push Notification Service

A multi-device web push notification backend service built with Node.js and TypeScript. This service enables applications to send push notifications to users across multiple devices and browsers simultaneously.

## 🚀 Features

- **Multi-Device Support**: Users can subscribe from multiple devices/browsers
- **Cross-Browser Compatibility**: Works with Chrome, Firefox, Safari, and Edge
- **RESTful API**: Clean API design with OpenAPI validation
- **Automatic Cleanup**: Invalid subscriptions are automatically removed
- **Detailed Reporting**: Success/failure tracking per user and device
- **Docker Support**: Easy deployment with Docker and Docker Compose

## 📋 Prerequisites

- Node.js 18+ or 22+
- Yarn package manager
- MongoDB 6+ or 8+
- Docker and Docker Compose (for containerized setup)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd push-notification-service
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications:

```bash
# Install web-push globally
yarn global add web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Save the generated public and private keys - you'll need them for configuration.

### 4. Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pushnotifications
VAPID_PUBLIC_KEY=<your-generated-public-key>
VAPID_PRIVATE_KEY=<your-generated-private-key>
VAPID_EMAIL=mailto:admin@example.com
LOG_LEVEL=info
```

### 5. Update the Test Page with Your VAPID Public Key

Edit `public/index.html` and replace the VAPID public key with your generated key:

```javascript
// Line 23 in public/index.html
const VAPID_PUBLIC_KEY = 'YOUR_GENERATED_PUBLIC_KEY_HERE';
```

This is required for the browser to subscribe to push notifications.

### 6. Running the Application

#### Option A: Local Development

1. **Start MongoDB** (if not using Docker):
```bash
# Using MongoDB installed locally
mongod
```

2. **Run the development server**:
```bash
yarn dev
```

The service will be available at `http://localhost:3000`

#### Option B: Docker Compose (Recommended)

1. **Build and start all services**:
```bash
docker-compose up --build
```

This will start:
- The push notification service on port 3000
- MongoDB on port 27017

2. **Stop services**:
```bash
docker-compose down
```

### 7. Testing the Service

#### Using the Test Web Page

1. Open your browser and navigate to: `http://localhost:3000`
2. The test page allows you to:
   - Subscribe the current device to push notifications
   - View all subscriptions for a user
   - Send test notifications to all your devices
   - Unsubscribe devices

#### Using the REST API

Example requests are provided in `tests/example_requests.http`. You can use these with:
- VS Code REST Client extension
- Postman
- curl

##### Subscribe a device:
```bash
curl -X POST http://localhost:3000/api/v1/users/user123/subscriptions \
  -H "Content-Type: application/json" \
  -H "X-UserId: user123" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    },
    "deviceInfo": {
      "userAgent": "Mozilla/5.0...",
      "deviceType": "desktop",
      "browserName": "Chrome"
    }
  }'
```

##### Send notification to a user (internal API):
```bash
curl -X POST http://localhost:3000/internalapi/v1/users/user123/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "notification": {
      "title": "Test Notification",
      "body": "Hello from the push service!"
    }
  }'
```

## 🧪 Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run tests with coverage
yarn test --coverage
```

## 📚 API Documentation

The service uses OpenAPI validation. The full API specification is available in `openapi.yaml`.

### Public API Endpoints

- `POST /api/v1/users/:userId/subscriptions` - Subscribe a device
- `GET /api/v1/users/:userId/subscriptions` - Get user's subscriptions
- `DELETE /api/v1/users/:userId/subscriptions/:endpoint` - Unsubscribe specific device
- `DELETE /api/v1/users/:userId/subscriptions` - Unsubscribe all devices

### Internal API Endpoints

- `POST /internalapi/v1/users/:userId/notifications` - Send to specific user
- `POST /internalapi/v1/notifications/broadcast` - Broadcast to all users

### Authorization

The public API implements a simple authorization mechanism:
- All requests must include an `X-UserId` header
- The service validates that the header value matches the `userId` in the URL path
- This prevents users from accessing or modifying other users' subscriptions

**Important:** This service does NOT handle authentication. It expects that:
- Authentication is performed by upstream infrastructure (API Gateway, reverse proxy, auth service, etc.)
- The infrastructure authenticates users and injects the verified `X-UserId` header
- The service trusts this header and only performs authorization checks

Example authorization flow:
1. User authenticates with your infrastructure (e.g., JWT token validation)
2. Infrastructure verifies the user identity and adds `X-UserId: user123` header
3. Request reaches this service with the trusted header
4. Service checks if `X-UserId` matches the requested resource's userId
5. Access is granted or denied based on this check

## 🏛️ Architecture

```
┌─────────────────────┐
│   Client App        │
│  (Your Backend)     │
└──────────┬──────────┘
           │ REST API
           │
┌──────────▼──────────┐     ┌─────────────────┐
│  Push Notification  │────►│    MongoDB      │
│     Service         │     │                 │
│   (This Service)    │     │ - Subscriptions │
│                     │     │                 │
└──────────┬──────────┘     └─────────────────┘
           │
           │ Web Push Protocol
           │
    ┌──────▼──────┐
    │  Push       │
    │  Providers  │
    │             │
    │ • FCM       │
    │ • APNS      │
    │ • Mozilla   │
    └─────────────┘
```

## 🚨 Important Notes

1. **VAPID Keys**: Keep your private key secure. Never commit it to version control.

2. **Browser Compatibility**: 
   - Users must grant notification permissions
   - Service workers must be served over HTTPS in production
   - localhost is allowed for development

3. **Subscription Management**: 
   - Invalid subscriptions (410/404 responses) are automatically deleted
   - Each device/browser creates a unique subscription per user

## 🐛 Troubleshooting

### Common Issues

1. **"Missing VAPID environment variables" error**
   - Ensure all VAPID keys are set in `.env`
   - Check that keys are properly formatted

2. **MongoDB connection errors**
   - Verify MongoDB is running
   - Check connection string in `.env`

3. **Notification not received**
   - Verify browser notification permissions
   - Check browser console for service worker errors
   - Ensure the page is served over HTTPS (or localhost)

### Logs

The service uses Pino for structured logging. In development, logs are pretty-printed to the console. In production, logs are output as JSON to stdout.
