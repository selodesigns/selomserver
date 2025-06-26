# SELO Media Server

![SELO Media Server Banner](https://via.placeholder.com/1200x300/0066cc/ffffff?text=SELO+Media+Server)

A modern, open-source media streaming server for your personal media collection.

Developed by [SELODev](https://selodev.com) | [GitHub](https://github.com/selodesigns/selomserver)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## ✨ Features

- 🎬 **Streaming** - Stream your media from anywhere on your network
- 🔄 **Transcoding** - On-the-fly transcoding for compatibility with any device
- 📱 **Responsive UI** - Beautiful interface that works on desktop and mobile
- 🔐 **User Management** - Create accounts for family and friends
- 📚 **Media Library** - Organize your movies, TV shows, and music
- 🔎 **Search & Discovery** - Find content easily with powerful search
- 📝 **Metadata** - Automatic fetching of movie and TV show information
- ⚡ **Performance** - Optimized for speed and efficiency
- 🔧 **Customizable** - Extensive configuration options

---

## 🖼️ Screenshots

<div align="center">
  <img src="https://via.placeholder.com/400x225/0066cc/ffffff?text=Home+Screen" alt="Home Screen" width="45%">
  <img src="https://via.placeholder.com/400x225/0066cc/ffffff?text=Media+Player" alt="Media Player" width="45%">
</div>

<div align="center">
  <img src="https://via.placeholder.com/400x225/0066cc/ffffff?text=Library+View" alt="Library View" width="45%">
  <img src="https://via.placeholder.com/400x225/0066cc/ffffff?text=Admin+Dashboard" alt="Admin Dashboard" width="45%">
</div>

---

## 💻 System Requirements

- **Node.js**: v18.0.0 or higher
- **FFmpeg**: Required for transcoding and thumbnail generation
- **Storage**: Space for your media library
- **RAM**: 2GB minimum (4GB+ recommended)
- **CPU**: 2+ cores recommended for transcoding
- **OS**: Windows, macOS, or Linux

---

## 🚀 Quick Start

Get up and running with just three commands:

```bash
# Clone the repository
git clone https://github.com/selodesigns/SELOMServer.git

# Navigate to the project directory
cd SELOMServer

# Run the quick start script
node scripts/quick-start.js
```

The quick start script will:
1. Check for required dependencies
2. Install Node.js packages
3. Set up basic configuration
4. Create necessary directories
5. Start the server

After installation, access SELO Media Server at: http://localhost:32400

---

## 📋 Installation

### Detailed Installation

For a more customized installation, follow these steps:

#### Linux / macOS

```bash
# Clone the repository
git clone https://github.com/selodesigns/SELOMServer.git

# Navigate to the project directory
cd SELOMServer

# Make the install script executable
chmod +x scripts/install.sh

# Run the install script
./scripts/install.sh
```

#### Windows

```powershell
# Clone the repository
git clone https://github.com/selodesigns/SELOMServer.git

# Navigate to the project directory
cd SELOMServer

# Run the install script
.\scripts\install.ps1
```

For more detailed installation instructions, see [INSTALLATION.md](docs/INSTALLATION.md).

---

## ⚙️ Configuration

SELO Media Server can be configured through environment variables or a `.env` file in the server directory.

### Basic Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `PORT` | Port number for the web server | 32400 |
| `SERVER_NAME` | Name of your media server | SELO Media Server |
| `MEDIA_LIBRARY_PATH` | Path to your media library | ./data/media |
| `LOG_LEVEL` | Logging level (error, warn, info, verbose, debug) | info |
| `ENABLE_TRANSCODING` | Enable or disable transcoding | true |
| `DEFAULT_QUALITY` | Default streaming quality | 1080p |

For complete configuration options, see [CONFIGURATION.md](docs/CONFIGURATION.md).

---

## 🚢 Docker Support

SELO Media Server can be run in a Docker container:

```bash
# Pull the Docker image
docker pull selodesigns/selomserver:latest

# Run the container
docker run -d \
  --name selomserver \
  -p 32400:32400 \
  -v /path/to/media:/app/data/media \
  -v /path/to/config:/app/data/config \
  selodesigns/selomserver:latest
```

For detailed Docker instructions, see [docker-compose.example.yml](config/docker-compose.example.yml).

---

## 🔌 API

SELO Media Server provides a comprehensive REST API for integration with other applications.

### Example API Requests

```bash
# Get server info
curl -X GET http://localhost:32400/api/server/info -H "Authorization: Bearer YOUR_TOKEN"

# List all movies
curl -X GET http://localhost:32400/api/library/movies -H "Authorization: Bearer YOUR_TOKEN"

# Start playback
curl -X POST http://localhost:32400/api/playback/start -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"mediaId": "123", "quality": "1080p"}'
```

For complete API documentation, see [API.md](docs/API.md).

---

## 🛠️ Troubleshooting

Common issues and their solutions:

- **Server won't start**: Check Node.js version and required dependencies
- **Media not found**: Ensure your media paths are configured correctly
- **Transcoding fails**: Verify FFmpeg is installed and accessible
- **Performance issues**: Check system resources and adjust transcoding settings

For more troubleshooting help, see [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- Check the [documentation](docs/)
- Open an [issue](https://github.com/selodesigns/selomserver/issues)
- Join our [community forum](https://example.com/forum)

---

## 🙏 Acknowledgements

- [FFmpeg](https://ffmpeg.org/) - For media processing capabilities
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [React](https://reactjs.org/) - Frontend UI library
- [Material-UI](https://mui.com/) - React UI framework
- [Express](https://expressjs.com/) - Web server framework
