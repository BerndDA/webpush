# Web Push Notification Service

This document outlines the requirements for a **multi-device web push notification backend service** built with Node.js and TypeScript. The service will enable applications to send push notifications to users across multiple devices and browsers simultaneously.

The implementation will use modern web push standards and work with all major browsers including Chrome, Firefox, Safari, and Edge on mobile and desktop devices.

## Functional Requirements

### Core Features
1. **Multi-Device User Management**
   - Store multiple push subscriptions per user (different devices/browsers)
   - Each subscription uniquely identified by endpoint
   - Support subscribe/unsubscribe operations for individual devices
   - Support unsubscribe all devices for a user
   - Maintain subscription status (active/inactive) per device
   - Track device metadata (user agent, browser name, device type)
   - Activity tracking (last active time per device)

2. **Notification Sending**
   - Send to all subscribed users (broadcast to all devices)
   - Send to specific user by ID (all active devices for that user)
   - Support standard web push payload (title, body, icon, badge, actions, data, etc.)
   - No retry mechanism - single send attempt only
   - Automatic cleanup of invalid subscriptions (410 Gone responses)
   - Detailed reporting (success/failure counts per user and device)

3. **Push Provider Support**
   - Support all major browsers via web push protocol
   - Use existing framework (e.g., web-push library for Node.js) to handle:
     - FCM for Chrome/Edge
     - Web Push Protocol for Firefox
     - APNS for Safari

### API Requirements
1. **REST API Endpoints**
   - Register new push subscription for a device
   - Remove all subscriptions for user
   - Remove specific device subscription
   - Send notification (to all users or specific user)
   - Get all subscriptions and devices for user

2. **API Design**
   - JSON request/response format
   - Structured error responses with success/data/error fields
   - No authentication (internal service only)
   - Support for device metadata in subscription requests

## Non-Functional Requirements

### Technical Stack
1. **Backend**: Node.js with TypeScript
2. **Database**: MongoDB
3. **Package Manager**: Yarn
4. **Framework**: Express.js
5. **Push Library**: web-push for Node.js
6. **Deployment**: Docker containers on Kubernetes
7. **Logging**: Pino for application logging (stdout only, no database logging)
8. **Testing**: Jest with TypeScript support

### Architecture
1. **Single-tenant**: One deployment per application
2. **Stateless API**: All state in MongoDB
3. **No message queuing**: Synchronous processing
4. **No caching required**: Direct DB access acceptable for 3k users

### Performance
1. **Scale**: Support 3,000 users with multiple devices each, 9,000+ notifications/day peak
2. **Multi-device**: Each user can have multiple active subscriptions (different browsers/devices)
3. **Latency**: No specific requirements
4. **Availability**: Standard Kubernetes deployment reliability
5. **Cleanup**: Maintain subscription validity by removing invalid subscriptions

## Additional Requirements

### Multi-Device Features
1. **Device Management**
   - Users can have unlimited active subscriptions
   - Each device/browser creates separate subscription
   - Subscriptions identified by unique endpoint
   - Support for device metadata collection

2. **Notification Distribution**
   - Send to all devices when targeting a user
   - Maintain per-device success/failure tracking
   - Automatic deactivation of failed subscriptions

3. **Data Integrity**
   - Upsert operations for subscription management
   - Compound database indexes for efficient queries
   - Automatic cleanup of stale subscriptions

## Additionally (manuell hinzugefügt von Bernd)
   - Deployment is not in scope
   - Local testing/execution must be possible (docker & docker compose)
   - Add Webpage and http requests for testing
   - Implement validation of all API input parameters