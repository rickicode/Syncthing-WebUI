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
   APP_HOST=localhost
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

## Security Notes

- Always use HTTPS in production
- Keep your Syncthing API key secure
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
