# Crypto Token Importer

A React application that allows users to connect their MetaMask wallet and import USDT tokens with a specific contract address.

## Features

- 🔗 Connect to MetaMask wallet
- 💰 Display wallet balance
- 🪙 Import USDT tokens to MetaMask
- 📋 Copy contract address to clipboard
- 🎨 Modern, responsive UI design

## Prerequisites

- Node.js (version 14 or higher)
- MetaMask browser extension
- A web browser with MetaMask installed

## Installation

1. Clone or download this project
2. Navigate to the project directory:
   ```bash
   cd /Users/jesussobredo/Documents/Test
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Install MetaMask**: Make sure you have the MetaMask browser extension installed
2. **Connect Wallet**: Click the "Connect MetaMask" button to connect your wallet
3. **Import Token**: Click "Add USDT to MetaMask" to import the USDT token
4. **Verify**: Check your MetaMask wallet to see the imported USDT token

## Token Configuration

The app is configured to import USDT with the following details:
- **Contract Address**: `0x6D39a10d110CEe17F9afBe53383BD5aa308c6fd3`
- **Symbol**: USDT
- **Name**: Tether USD
- **Decimals**: 18

## Technologies Used

- React 18
- Web3.js
- MetaMask API
- CSS3 with modern styling
- Responsive design

## Security Notes

- Always verify contract addresses before importing tokens
- This app only facilitates token import - it doesn't store any private keys
- All wallet operations are handled by MetaMask

## Troubleshooting

- **MetaMask not detected**: Make sure MetaMask is installed and enabled
- **Connection failed**: Check if MetaMask is unlocked and on the correct network
- **Token not added**: Ensure you're on the correct network for the token

## License

This project is open source and available under the MIT License.
