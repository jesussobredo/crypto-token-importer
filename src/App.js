import React, { useState, useEffect } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3';

// USDT Token Configuration for BSC
const USDT_CONFIG = {
  address: '0x6D39a10d110CEe17F9afBe53383BD5aa308c6fd3', // Custom USDT contract
  symbol: 'USDT',
  decimals: 18,
  name: 'Tether USD',
  logo: '/new-tether-logo.png',
  description: 'Tether gives you the joint benefits of open blockchain technology and traditional currency by converting your cash into a stable digital currency equivalent.',
  website: 'https://tether.to',
  explorer: 'https://bscscan.com/token/0x6D39a10d110CEe17F9afBe53383BD5aa308c6fd3',
  totalSupply: 'Unlimited',
  type: 'BEP-20',
  network: 'Binance Smart Chain'
};

// BSC Network Configuration
const BSC_NETWORK = {
  chainId: '0x38', // 56 in decimal
  chainName: 'Binance Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
};

function App() {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/new-tether-logo.png');
  const [currentNetwork, setCurrentNetwork] = useState('');
  const [metamaskLogoUrl, setMetamaskLogoUrl] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkConnection();
    testLogoUrl();
    checkNetwork();
    testMetaMaskLogoUrl();
  }, []);

  const checkNetwork = async () => {
    if (provider) {
      try {
        const chainId = await provider.request({ method: 'eth_chainId' });
        const networkName = getNetworkName(chainId);
        setCurrentNetwork(networkName);
      } catch (error) {
        console.error('Error checking network:', error);
      }
    }
  };

  const getNetworkName = (chainId) => {
    switch (chainId) {
      case '0x38': // 56 in decimal
        return 'Binance Smart Chain';
      case '0x1': // 1 in decimal
        return 'Ethereum Mainnet';
      case '0x89': // 137 in decimal
        return 'Polygon';
      default:
        return `Unknown Network (${chainId})`;
    }
  };

  const testLogoUrl = async () => {
    // Use only your local logo file with fallback
    const logoPath = '/new-tether-logo.png';
    setLogoUrl(logoPath);
    console.log('Using new logo file:', logoPath);
  };

  const testMetaMaskLogoUrl = async () => {
    // Use only your local logo file with fallback
    const logoPath = '/new-tether-logo.png';
    setMetamaskLogoUrl(logoPath);
    console.log('Using local logo file:', logoPath);
  };

  const checkConnection = async () => {
    try {
      const ethereumProvider = await detectEthereumProvider();
      
      if (ethereumProvider) {
        setProvider(ethereumProvider);
        const web3Instance = new Web3(ethereumProvider);
        setWeb3(web3Instance);
        
        // Check if already connected
        const accounts = await ethereumProvider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          await getBalance(accounts[0]);
        }
      } else {
        setStatus('MetaMask not detected. Please install MetaMask to use this app.');
        setStatusType('error');
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setStatus('Error checking MetaMask connection.');
      setStatusType('error');
    }
  };

  const connectWallet = async () => {
    if (!provider) {
      setStatus('MetaMask not detected. Please install MetaMask.');
      setStatusType('error');
      return;
    }

    setIsLoading(true);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setStatus('Wallet connected successfully!');
        setStatusType('success');
        await getBalance(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        setStatus('User rejected the connection request.');
      } else {
        setStatus('Error connecting to MetaMask wallet.');
      }
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const getBalance = async (accountAddress) => {
    if (!web3) return;
    
    try {
      const balance = await web3.eth.getBalance(accountAddress);
      const balanceInEth = web3.utils.fromWei(balance, 'ether');
      setBalance(parseFloat(balanceInEth).toFixed(4));
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  const addTokenToMetaMask = async () => {
    if (!provider || !isConnected) {
      setStatus('Please connect your wallet first.');
      setStatusType('error');
      return;
    }

    setIsLoading(true);
    try {
      // Use the full URL for MetaMask compatibility
      const baseUrl = window.location.origin;
      const logoForMetaMask = `${baseUrl}/new-tether-logo.png`;
      
      console.log('Adding token to MetaMask with logo:', logoForMetaMask);
      console.log('Token details:', {
        address: USDT_CONFIG.address,
        symbol: USDT_CONFIG.symbol,
        decimals: USDT_CONFIG.decimals,
        name: USDT_CONFIG.name,
        image: logoForMetaMask
      });
      
      // Try the standard method first
      try {
        const wasAdded = await provider.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: USDT_CONFIG.address,
              symbol: USDT_CONFIG.symbol,
              decimals: USDT_CONFIG.decimals,
              image: logoForMetaMask,
              name: USDT_CONFIG.name,
            },
          },
        });

        if (wasAdded) {
          setStatus('USDT token successfully added to MetaMask! The logo should appear in your wallet.');
          setStatusType('success');
          return;
        }
      } catch (standardError) {
        console.log('Standard method failed, trying alternative method:', standardError);
        
        // Try alternative method for Android MetaMask
        try {
          const wasAdded = await provider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: USDT_CONFIG.address,
                symbol: USDT_CONFIG.symbol,
                decimals: USDT_CONFIG.decimals,
                name: USDT_CONFIG.name,
                // Remove image for Android compatibility
              },
            },
          });

          if (wasAdded) {
            setStatus('USDT token added to MetaMask! (Logo may not appear on Android)');
            setStatusType('success');
            return;
          }
        } catch (altError) {
          console.log('Alternative method also failed:', altError);
          throw altError;
        }
      }

      setStatus('Token was not added. Please try again.');
      setStatusType('error');
    } catch (error) {
      console.error('Error adding token:', error);
      if (error.code === 4001) {
        setStatus('User rejected the token import request.');
      } else if (error.code === -32601) {
        setStatus('This method is not supported on your device. Please add the token manually using the contract address.');
        setStatusType('error');
      } else {
        setStatus('Error adding token to MetaMask. Please try again or add manually.');
      }
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(USDT_CONFIG.address);
    setStatus('Contract address copied to clipboard!');
    setStatusType('success');
    setTimeout(() => setStatus(''), 3000);
  };

  const switchToBSC = async () => {
    if (!provider) {
      setStatus('MetaMask not detected.');
      setStatusType('error');
      return;
    }

    setIsLoading(true);
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_NETWORK.chainId }],
      });
      setStatus('Switched to Binance Smart Chain!');
      setStatusType('success');
      setCurrentNetwork('Binance Smart Chain');
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_NETWORK],
          });
          setStatus('Binance Smart Chain added and switched!');
          setStatusType('success');
          setCurrentNetwork('Binance Smart Chain');
        } catch (addError) {
          console.error('Error adding BSC network:', addError);
          setStatus('Error adding Binance Smart Chain network.');
          setStatusType('error');
        }
      } else {
        console.error('Error switching to BSC:', switchError);
        setStatus('Error switching to Binance Smart Chain.');
        setStatusType('error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setBalance('0');
    setStatus('Wallet disconnected.');
    setStatusType('info');
  };

  return (
    <div className="container">
      {/* Official Tether Header */}
      <header className="tether-header">
        <div className="header-content">
          <div className="header-left">
            <img 
              src="/new-tether-logo.png" 
              alt="Tether Logo" 
              className="tether-logo"
            />
            <span className="tether-brand">Tether</span>
          </div>
          
          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="https://tether.to/en/why-tether" target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Why Tether?</a>
            <a href="https://tether.to/en/how-it-works" target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="https://tether.io/news/" target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => setMobileMenuOpen(false)}>News</a>
            <a href="https://gold.tether.to/" target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Tether Gold</a>
            <a href="https://tether.to/en/transparency/?tab=usdt" target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Transparency</a>
          </nav>
          
          <div className="header-auth">
            <a href="https://app.tether.to/app/login" target="_blank" rel="noopener noreferrer" className="auth-btn login-btn">Log In</a>
            <a href="https://tether.to/en/geo/eu/" target="_blank" rel="noopener noreferrer" className="auth-btn signup-btn">Sign Up</a>
            <button 
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>



      <div className="card">
        <h2 style={{ color: '#009393', fontSize: '1.8rem', fontWeight: '600', marginBottom: '20px' }}>USDT Token Information</h2>
        <div className="token-info">
          <div className="token-logo">
            <img 
              src={logoUrl} 
              alt="USDT Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                display: 'block',
                aspectRatio: '1/1'
              }}
              onError={(e) => {
                console.log('Image failed to load:', logoUrl);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', logoUrl);
              }}
            />
            <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #667eea, #764ba2)', color: 'white', fontWeight: 'bold', fontSize: '18px', borderRadius: '50%' }}>
              USDT
            </div>
          </div>
          <div className="token-details">
            <h3>{USDT_CONFIG.name}</h3>
            <p><strong>Symbol:</strong> {USDT_CONFIG.symbol}</p>
            <p><strong>Type:</strong> {USDT_CONFIG.type}</p>
            <p><strong>Network:</strong> {USDT_CONFIG.network}</p>
            <p><strong>Decimals:</strong> {USDT_CONFIG.decimals}</p>
            <p><strong>Total Supply:</strong> {USDT_CONFIG.totalSupply}</p>
            <p><strong>Contract:</strong> {USDT_CONFIG.address}</p>
            <p><strong>Description:</strong> {USDT_CONFIG.description}</p>
            <div style={{ marginTop: '10px' }}>
              <a href={USDT_CONFIG.explorer} target="_blank" rel="noopener noreferrer" style={{ color: '#009393', textDecoration: 'none', fontWeight: '500' }}>
                🔍 View on BSCScan
              </a>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          {!isConnected ? (
            <button 
              className="btn btn-primary" 
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <button 
              className="btn btn-success" 
              onClick={addTokenToMetaMask}
              disabled={isLoading}
            >
              {isLoading ? 'Adding Token...' : 'Add USDT to MetaMask'}
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className={`status status-${statusType}`}>
          {status}
        </div>
      )}


      <footer className="tether-footer">
        <div className="footer-content">
          <div className="footer-main">
            <h2>Driving the Future of Money</h2>
            <p>Tether supports and empowers growing ventures and innovation throughout the blockchain as a digital token built on multiple blockchains.</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-section">
              <h4>Tether</h4>
              <ul>
                <li><a href="https://tether.to/en/why-tether" target="_blank" rel="noopener noreferrer">Why Tether?</a></li>
                <li><a href="https://tether.to/en/how-it-works" target="_blank" rel="noopener noreferrer">How It Works</a></li>
                <li><a href="https://tether.to/en/knowledge-base" target="_blank" rel="noopener noreferrer">Knowledge Base</a></li>
                <li><a href="https://tether.to/en/transparency" target="_blank" rel="noopener noreferrer">Transparency</a></li>
                <li><a href="https://tether.to/en/fees" target="_blank" rel="noopener noreferrer">Fees</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="https://tether.to/en/about-us" target="_blank" rel="noopener noreferrer">About Us</a></li>
                <li><a href="https://tether.to/en/careers" target="_blank" rel="noopener noreferrer">Careers</a></li>
                <li><a href="https://tether.to/en/contact-us" target="_blank" rel="noopener noreferrer">Contact Us</a></li>
                <li><a href="https://tether.to/en/legal-terms" target="_blank" rel="noopener noreferrer">Legal Terms</a></li>
                <li><a href="https://tether.to/en/cookie-settings" target="_blank" rel="noopener noreferrer">Cookie Settings</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><a href="https://tether.io/news/" target="_blank" rel="noopener noreferrer">News</a></li>
                <li><a href="https://tether.to/en/faqs" target="_blank" rel="noopener noreferrer">FAQs</a></li>
                <li><a href="https://tether.to/en/integration-guidelines" target="_blank" rel="noopener noreferrer">Integration Guidelines</a></li>
                <li><a href="https://tether.to/en/bug-bounty" target="_blank" rel="noopener noreferrer">Bug Bounty</a></li>
                <li><a href="https://tether.to/en/media-assets" target="_blank" rel="noopener noreferrer">Media Assets</a></li>
                <li><a href="https://tether.to/en/tether-facts" target="_blank" rel="noopener noreferrer">Tether Facts</a></li>
                <li><a href="https://tether.to/en/relevant-information-document" target="_blank" rel="noopener noreferrer">Relevant Information Document</a></li>
                <li><a href="https://tether.to/en/tether-channels" target="_blank" rel="noopener noreferrer">Tether Channels</a></li>
                <li><a href="https://tether.to/en/security-features" target="_blank" rel="noopener noreferrer">Security Features</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Products</h4>
              <ul>
                <li><a href="https://tether.to/en/tether-token-cnht" target="_blank" rel="noopener noreferrer">Tether token CNHt</a></li>
                <li><a href="https://tether.to/en/tether-token-eurt" target="_blank" rel="noopener noreferrer">Tether token EURt</a></li>
                <li><a href="https://tether.to/en/tether-token-mxnt" target="_blank" rel="noopener noreferrer">Tether token MXNt</a></li>
                <li><a href="https://tether.to/en/tether-token-usdt" target="_blank" rel="noopener noreferrer">Tether token USDt</a></li>
                <li><a href="https://tether.to/en/tether-gold-token-xaut" target="_blank" rel="noopener noreferrer">Tether Gold token - XAUt</a></li>
                <li><a href="https://tether.to/en/alloy-by-tether" target="_blank" rel="noopener noreferrer">Alloy by Tether</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Solutions</h4>
              <ul>
                <li><a href="https://tether.to/en/for-individuals" target="_blank" rel="noopener noreferrer">For Individuals</a></li>
                <li><a href="https://tether.to/en/for-merchants" target="_blank" rel="noopener noreferrer">For Merchants</a></li>
                <li><a href="https://tether.to/en/for-exchanges" target="_blank" rel="noopener noreferrer">For Exchanges</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-brand">
            <div className="footer-logo">₮</div>
            <span className="footer-brand-text">tether</span>
            <span className="footer-copyright">Copyright © 2013 - 2025 Tether Operations, S.A. de C.V. All rights reserved.</span>
          </div>
          
          <div className="footer-social">
            <a href="https://instagram.com/tether.to" target="_blank" rel="noopener noreferrer" className="social-link">📷</a>
            <a href="https://twitter.com/tether_to" target="_blank" rel="noopener noreferrer" className="social-link">🐦</a>
            <a href="https://youtube.com/@tether" target="_blank" rel="noopener noreferrer" className="social-link">📺</a>
            <a href="https://t.me/tether_official" target="_blank" rel="noopener noreferrer" className="social-link">✈️</a>
            <a href="https://linkedin.com/company/tether" target="_blank" rel="noopener noreferrer" className="social-link">💼</a>
            <a href="https://facebook.com/tether.to" target="_blank" rel="noopener noreferrer" className="social-link">📘</a>
            <a href="https://reddit.com/r/Tether" target="_blank" rel="noopener noreferrer" className="social-link">🔴</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
