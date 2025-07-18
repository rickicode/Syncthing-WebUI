# Syncthing Web UI

A lightweight, fast web interface for managing Syncthing servers with support for large numbers of devices and folders.

## Features

- **Lightweight & Fast**: Optimized for servers with 200+ devices and folders
- **Complete CRUD Operations**: Add, edit, delete devices and folders
- **Real-time Search**: Search across all fields (names, IDs, paths, status)
- **Table-based Layout**: Clean, efficient interface with pagination
- **Responsive Design**: Works on desktop and mobile devices
- **RESTful API**: Clean API endpoints for all operations

## Requirements

- Node.js 14+ 
- Syncthing server with REST API enabled
- Syncthing API key

## Installation

### Option 1: Docker Compose (Recommended)

1. Clone or download this repository
2. Copy the Docker environment template:
   ```bash
   cp .env.docker .env
   ```

3. Start both Syncthing and the Web UI:
   ```bash
   docker-compose up -d
   ```

4. Get the Syncthing API key:
   - Open Syncthing web interface at `http://localhost:8384`
   - Go to **Settings** → **General**
   - Copy the **API Key**
   - Update the `.env` file with your API key:
     ```env
     SYNCTHING_API_KEY=your-actual-api-key-here
     ```

5. Restart the web UI container:
   ```bash
   docker-compose restart syncthing-webui
   ```

The web interface will be available at `http://localhost:4567`.

**Default Login:** When authentication is enabled, use the default password `admin123` to login, or change it in your `.env` file.

### Option 2: Manual Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

4. Configure your Syncthing server settings in `.env`:
   ```env
   SYNCTHING_HOST=localhost
   SYNCTHING_PORT=8384
   SYNCTHING_API_KEY=your-api-key-here
   SYNCTHING_HTTPS=false
   APP_PORT=4567
   APP_HOST=0.0.0.0
   ```

## Getting Your Syncthing API Key

1. Open your Syncthing web interface (usually http://localhost:8384)
2. Go to **Settings** → **General**
3. Copy the **API Key** from the settings
4. Paste it into your `.env` file

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The web interface will be available at `http://localhost:4567` (or your configured port).

## Docker Management

### Building the Docker Image

To build the Docker image locally:

```bash
# Build the image
docker build -t syncthing-webui .

# Run the container
docker run -d \
  --name syncthing-webui \
  -p 4567:4567 \
  -e SYNCTHING_HOST=your-syncthing-host \
  -e SYNCTHING_API_KEY=your-api-key \
  -e AUTH_PASSWORD=your-password \
  syncthing-webui
```

### Using Docker Compose

#### Starting the Services
```bash
docker-compose up -d
```

#### Stopping the Services
```bash
docker-compose down
```

#### Viewing Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs syncthing
docker-compose logs syncthing-webui

# Follow logs in real-time
docker-compose logs -f
```

#### Updating the Images
```bash
docker-compose pull
docker-compose up -d
```

### Data Persistence
- Syncthing configuration: `./syncthing-config`
- Syncthing data: `./syncthing-data`

Make sure to backup these directories to preserve your Syncthing configuration and synchronized files.

## API Endpoints

### Devices
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `PUT /api/devices/:deviceID` - Update device
- `DELETE /api/devices/:deviceID` - Delete device

### Folders
- `GET /api/folders` - List all folders
- `POST /api/folders` - Add new folder
- `PUT /api/folders/:folderID` - Update folder
- `DELETE /api/folders/:folderID` - Delete folder
- `POST /api/folders/:folderID/pause` - Pause folder
- `POST /api/folders/:folderID/resume` - Resume folder

### System
- `GET /api/system/status` - Get system status
- `GET /api/system/config` - Get system configuration
- `GET /api/system/connections` - Get connection status

## Features Overview

### Device Management
- View all devices with connection status
- Add devices with custom configuration
- Edit device settings (name, addresses, compression, etc.)
- Delete devices (automatically removes from shared folders)
- Real-time connection status

### Folder Management
- View all folders with sync status
- Add folders with device sharing
- Edit folder settings
- Pause/resume folder synchronization
- Delete folders

### Search & Filter
- Global search across all fields
- Real-time filtering as you type
- Search by:
  - Device names and IDs
  - Folder names, IDs, and paths
  - Connection status
  - Folder types and status

### Performance Optimizations
- Pagination (20 items per page)
- Efficient table rendering
- Minimal CSS/JS footprint
- Optimized API calls
- Client-side caching

## Browser Support

- Chrome/Chromium 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Authentication

The web interface includes password-only authentication for security.

### Configuration

Authentication can be configured in your `.env` file:

```env
# Authentication settings
AUTH_ENABLED=true                    # Enable/disable authentication
AUTH_PASSWORD=your-secure-password   # Set your password
SESSION_SECRET=your-session-secret   # Session encryption key
```

### Default Credentials

- **Password:** `admin123` (change this in production!)

### Features

- **Password-only login** - No username required
- **Persistent sessions** - Stay logged in until you logout
- **Automatic logout** - Click the logout button to end your session
- **Session security** - Sessions are encrypted and secured

### Disabling Authentication

To disable authentication completely, set `AUTH_ENABLED=false` in your `.env` file.

## Security Notes

- Always use HTTPS in production
- Keep your Syncthing API key secure
- Change the default authentication password
- Use a strong session secret in production
- Consider firewall rules for the web interface
- The application runs on the server, not in Syncthing's web interface

## Troubleshooting

### Connection Issues
1. Verify Syncthing is running and API is enabled
2. Check the API key is correct
3. Ensure no firewall blocking the connection
4. Verify the host and port settings

### Performance Issues
1. Check if you have too many folders/devices loading
2. Verify your Syncthing server has adequate resources
3. Consider increasing pagination size if needed

## Development

### Project Structure
```
syncthing-webui/
├── server/                 # Backend API server
│   ├── services/          # Syncthing API service
│   └── routes/           # API route handlers
├── public/               # Frontend files
│   ├── css/             # Styles
│   └── js/              # JavaScript modules
└── package.json         # Dependencies and scripts
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built for the Syncthing community
- Designed for high-performance server management
- Inspired by the need for lightweight alternatives to the default web UI
