import React, { useState, useEffect } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3';
import ErrorBoundary from './ErrorBoundary';

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

// Error handling utilities
const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  USER_REJECTED: 'USER_REJECTED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

const getErrorMessage = (error, context = '') => {
  console.error(`Error in ${context}:`, error);
  
  if (error.code === 4001) {
    return {
      type: ErrorTypes.USER_REJECTED,
      message: 'User rejected the request. Please try again if you want to proceed.',
      userFriendly: 'Request was cancelled. You can try again anytime.'
    };
  }
  
  if (error.code === -32601) {
    return {
      type: ErrorTypes.PROVIDER_ERROR,
      message: 'Method not supported by your wallet.',
      userFriendly: 'This feature is not supported by your current wallet. Please try a different wallet or update your current one.'
    };
  }
  
  if (error.code === 4902) {
    return {
      type: ErrorTypes.NETWORK_ERROR,
      message: 'Network not found in wallet.',
      userFriendly: 'Network not found. We will try to add it automatically.'
    };
  }
  
  if (error.message?.includes('network')) {
    return {
      type: ErrorTypes.NETWORK_ERROR,
      message: 'Network connection error.',
      userFriendly: 'Network connection issue. Please check your internet connection and try again.'
    };
  }
  
  if (error.message?.includes('timeout')) {
    return {
      type: ErrorTypes.NETWORK_ERROR,
      message: 'Request timeout.',
      userFriendly: 'Request timed out. Please try again.'
    };
  }
  
  return {
    type: ErrorTypes.UNKNOWN_ERROR,
    message: error.message || 'An unexpected error occurred.',
    userFriendly: 'Something went wrong. Please try again or refresh the page.'
  };
};

const logError = (error, context, additionalInfo = {}) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack
    },
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalInfo
  };
  
  console.error('Error logged:', errorDetails);
  
  // In production, you would send this to an error tracking service
  // Example: sendToErrorService(errorDetails);
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
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check network connectivity first
        const isNetworkAvailable = await checkNetworkConnectivity();
        if (!isNetworkAvailable) {
          setStatus('Network connectivity issue detected. Some features may not work properly.');
          setStatusType('warning');
        }

        await checkConnection();
        testLogoUrl();
        await checkNetwork();
        testMetaMaskLogoUrl();
      } catch (error) {
        const errorInfo = getErrorMessage(error, 'initializeApp');
        logError(error, 'initializeApp');
        setStatus(errorInfo.userFriendly);
        setStatusType('error');
      }
    };

    // Global error handlers
    const handleUnhandledRejection = (event) => {
      logError(event.reason, 'unhandledRejection', { 
        type: 'unhandledRejection',
        promise: event.promise
      });
    };

    const handleError = (event) => {
      logError(event.error, 'globalError', { 
        type: 'globalError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    // Add global error listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    initializeApp();

    // Cleanup function to remove event listeners
    return () => {
      if (provider) {
        provider.removeAllListeners('chainChanged');
        provider.removeAllListeners('accountsChanged');
      }
      
      // Remove global error listeners
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [provider]);

  const checkNetwork = async () => {
    if (provider) {
      try {
        const chainId = await provider.request({ method: 'eth_chainId' });
        const networkName = getNetworkName(chainId);
        setCurrentNetwork(networkName);
      } catch (error) {
        const errorInfo = getErrorMessage(error, 'checkNetwork');
        logError(error, 'checkNetwork', { 
          provider: !!provider,
          isConnected
        });
        
        console.error('Error checking network:', errorInfo.message);
        setCurrentNetwork('Unknown Network');
      }
    }
  };

  // Network connectivity check
  const checkNetworkConnectivity = async () => {
    try {
      const response = await fetch('https://bsc-dataseed.binance.org/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (error) {
      logError(error, 'checkNetworkConnectivity');
      return false;
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
          
          // Check and ensure correct network
          await ensureCorrectNetwork();
          
          await getBalance(accounts[0]);
        }
        
        // Set up chain change listener
        setupChainChangeListener(ethereumProvider);
      } else {
        setStatus('MetaMask not detected. Please install MetaMask to use this app.');
        setStatusType('error');
      }
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'checkConnection');
      logError(error, 'checkConnection', { 
        provider: !!provider,
        isConnected 
      });
      
      setStatus(errorInfo.userFriendly);
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
        
        // Check current chain and switch to BSC if needed
        await ensureCorrectNetwork();
        
        setStatus('Wallet connected successfully!');
        setStatusType('success');
        await getBalance(accounts[0]);
      }
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'connectWallet');
      logError(error, 'connectWallet', { 
        provider: !!provider,
        isConnected 
      });
      
      setStatus(errorInfo.userFriendly);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const getBalance = async (accountAddress) => {
    if (!web3) {
      console.warn('Web3 not available for balance check');
      return;
    }
    
    if (!accountAddress) {
      console.warn('No account address provided for balance check');
      return;
    }
    
    try {
      const balance = await web3.eth.getBalance(accountAddress);
      const balanceInEth = web3.utils.fromWei(balance, 'ether');
      setBalance(parseFloat(balanceInEth).toFixed(4));
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'getBalance');
      logError(error, 'getBalance', { 
        accountAddress,
        web3Available: !!web3,
        provider: !!provider
      });
      
      // Don't show error to user for balance check failures
      // Just log it and set balance to 0
      setBalance('0');
      console.warn('Failed to get balance:', errorInfo.message);
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
      // First, ensure we're on the correct network (BSC)
      setStatus('Ensuring you are on Binance Smart Chain...');
      setStatusType('info');
      
      const currentChainId = await provider.request({ method: 'eth_chainId' });
      console.log('Current chain ID:', currentChainId);
      console.log('Required BSC chain ID:', BSC_NETWORK.chainId);
      
      if (currentChainId !== BSC_NETWORK.chainId) {
        console.log('Not on BSC network, switching...');
        setStatus('Switching to Binance Smart Chain before adding token...');
        setStatusType('info');
        
        const switchSuccess = await switchToBSC();
        if (!switchSuccess) {
          throw new Error('Failed to switch to Binance Smart Chain. Please switch manually and try again.');
        }
        
        setStatus('Successfully switched to Binance Smart Chain. Now adding token...');
        setStatusType('success');
      } else {
        setStatus('Already on Binance Smart Chain. Adding token...');
        setStatusType('info');
      }

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
          setStatus('USDT token successfully added to MetaMask on Binance Smart Chain! The logo should appear in your wallet.');
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
            setStatus('USDT token added to MetaMask on Binance Smart Chain! (Logo may not appear on Android)');
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
      const errorInfo = getErrorMessage(error, 'addTokenToMetaMask');
      logError(error, 'addTokenToMetaMask', { 
        provider: !!provider,
        isConnected,
        tokenAddress: USDT_CONFIG.address
      });
      
      setStatus(errorInfo.userFriendly);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(USDT_CONFIG.address);
        setStatus('Contract address copied to clipboard!');
        setStatusType('success');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = USDT_CONFIG.address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setStatus('Contract address copied to clipboard!');
          setStatusType('success');
        } catch (fallbackError) {
          throw new Error('Clipboard access not available');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'copyAddress');
      logError(error, 'copyAddress', { 
        clipboardSupported: !!navigator.clipboard,
        isSecureContext: window.isSecureContext
      });
      
      setStatus('Failed to copy address. Please copy manually: ' + USDT_CONFIG.address);
      setStatusType('error');
    }
    
    setTimeout(() => setStatus(''), 3000);
  };

  const switchToBSC = async () => {
    if (!provider) {
      setStatus('MetaMask not detected.');
      setStatusType('error');
      return false;
    }

    try {
      console.log('Attempting to switch to BSC network...');
      
      // First try to switch to the existing BSC network
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_NETWORK.chainId }],
        });
        
        // Verify the switch was successful
        const chainId = await provider.request({ method: 'eth_chainId' });
        if (chainId === BSC_NETWORK.chainId) {
          setStatus('Successfully switched to Binance Smart Chain!');
          setStatusType('success');
          setCurrentNetwork('Binance Smart Chain');
          return true;
        } else {
          throw new Error('Network switch verification failed');
        }
      } catch (switchError) {
        console.log('Switch failed, trying to add network:', switchError);
        
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            setStatus('Adding Binance Smart Chain to MetaMask...');
            setStatusType('info');
            
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [BSC_NETWORK],
            });
            
            // Verify the network was added and we're now on BSC
            const chainId = await provider.request({ method: 'eth_chainId' });
            if (chainId === BSC_NETWORK.chainId) {
              setStatus('Binance Smart Chain added and switched successfully!');
              setStatusType('success');
              setCurrentNetwork('Binance Smart Chain');
              return true;
            } else {
              throw new Error('Network addition verification failed');
            }
          } catch (addError) {
            const errorInfo = getErrorMessage(addError, 'switchToBSC_addNetwork');
            logError(addError, 'switchToBSC_addNetwork', { 
              provider: !!provider,
              networkConfig: BSC_NETWORK
            });
            
            setStatus(errorInfo.userFriendly);
            setStatusType('error');
            return false;
          }
        } else {
          const errorInfo = getErrorMessage(switchError, 'switchToBSC_switch');
          logError(switchError, 'switchToBSC_switch', { 
            provider: !!provider,
            targetChainId: BSC_NETWORK.chainId
          });
          
          setStatus(errorInfo.userFriendly);
          setStatusType('error');
          return false;
        }
      }
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'switchToBSC');
      logError(error, 'switchToBSC', { 
        provider: !!provider,
        targetChainId: BSC_NETWORK.chainId
      });
      
      setStatus(errorInfo.userFriendly);
      setStatusType('error');
      return false;
    }
  };

  const ensureCorrectNetwork = async () => {
    if (!provider) return;

    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      
      // If not on BSC, automatically switch
      if (chainId !== BSC_NETWORK.chainId) {
        console.log('Wrong network detected, switching to BSC automatically...');
        setStatus('Switching to Binance Smart Chain automatically...');
        setStatusType('info');
        
        await switchToBSC();
      } else {
        setCurrentNetwork('Binance Smart Chain');
      }
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'ensureCorrectNetwork');
      logError(error, 'ensureCorrectNetwork', { 
        provider: !!provider,
        isConnected
      });
      
      console.error('Error checking network:', errorInfo.message);
      // Don't show error to user for network check failures
      // Just log it silently
    }
  };

  const setupChainChangeListener = (ethereumProvider) => {
    // Listen for chain changes
    ethereumProvider.on('chainChanged', async (chainId) => {
      console.log('Chain changed to:', chainId);
      setCurrentNetwork(getNetworkName(chainId));
      
      // If user switched to wrong chain, automatically switch back to BSC
      if (chainId !== BSC_NETWORK.chainId && isConnected) {
        console.log('User switched to wrong network, switching back to BSC...');
        setStatus('Switching back to Binance Smart Chain...');
        setStatusType('info');
        
        try {
          await switchToBSC();
        } catch (error) {
          const errorInfo = getErrorMessage(error, 'setupChainChangeListener_switchBack');
          logError(error, 'setupChainChangeListener_switchBack', { 
            chainId,
            isConnected,
            targetChainId: BSC_NETWORK.chainId
          });
          
          console.error('Error switching back to BSC:', errorInfo.message);
          setStatus('Failed to switch back to Binance Smart Chain. Please switch manually.');
          setStatusType('error');
        }
      }
    });

    // Listen for account changes
    ethereumProvider.on('accountsChanged', async (accounts) => {
      try {
        if (accounts.length === 0) {
          // User disconnected
          setAccount(null);
          setIsConnected(false);
          setBalance('0');
          setStatus('Wallet disconnected.');
          setStatusType('info');
        } else if (accounts[0] !== account) {
          // User switched accounts
          setAccount(accounts[0]);
          setIsConnected(true);
          await getBalance(accounts[0]);
          await ensureCorrectNetwork();
        }
      } catch (error) {
        const errorInfo = getErrorMessage(error, 'setupChainChangeListener_accountsChanged');
        logError(error, 'setupChainChangeListener_accountsChanged', { 
          accountsLength: accounts.length,
          isConnected
        });
        
        console.error('Error handling account change:', errorInfo.message);
      }
    });
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setBalance('0');
    setStatus('Wallet disconnected.');
    setStatusType('info');
  };

  // Retry mechanism for failed operations
  const retryOperation = async (operation, operationName, ...args) => {
    if (retryCount >= maxRetries) {
      setStatus(`Failed after ${maxRetries} attempts. Please refresh the page and try again.`);
      setStatusType('error');
      setRetryCount(0);
      return;
    }

    try {
      setRetryCount(prev => prev + 1);
      setStatus(`Retrying ${operationName}... (Attempt ${retryCount + 1}/${maxRetries})`);
      setStatusType('info');
      
      await operation(...args);
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      const errorInfo = getErrorMessage(error, `retryOperation_${operationName}`);
      logError(error, `retryOperation_${operationName}`, { 
        retryCount: retryCount + 1,
        maxRetries
      });
      
      if (retryCount + 1 < maxRetries) {
        setTimeout(() => retryOperation(operation, operationName, ...args), 2000);
      } else {
        setStatus(errorInfo.userFriendly);
        setStatusType('error');
        setRetryCount(0);
      }
    }
  };

  return (
    <ErrorBoundary>
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
        
        {isConnected && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                <strong>Current Network:</strong> 
                <span style={{ 
                  color: currentNetwork === 'Binance Smart Chain' ? '#28a745' : '#dc3545',
                  fontWeight: 'bold',
                  marginLeft: '5px'
                }}>
                  {currentNetwork}
                  {currentNetwork === 'Binance Smart Chain' ? ' ✅' : ' ❌'}
                </span>
              </p>
              {currentNetwork !== 'Binance Smart Chain' && (
                <button 
                  onClick={switchToBSC}
                  disabled={isLoading}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#009393',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Switch to BSC
                </button>
              )}
            </div>
            <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6c757d' }}>
              <strong>Wallet Address:</strong> {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
            </p>
            <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
              <strong>BNB Balance:</strong> {balance} BNB
            </p>
          </div>
        )}
        
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
            <div>
              {currentNetwork !== 'Binance Smart Chain' && (
                <div style={{
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '5px',
                  marginBottom: '15px',
                  color: '#856404'
                }}>
                  ⚠️ <strong>Warning:</strong> You are not on Binance Smart Chain. 
                  The token will be automatically added to BSC when you click the button below.
                </div>
              )}
              <button 
                className="btn btn-success" 
                onClick={addTokenToMetaMask}
                disabled={isLoading}
              >
                {isLoading ? 'Adding Token...' : 
                 currentNetwork === 'Binance Smart Chain' ? 
                 'Add USDT to MetaMask' : 
                 'Add USDT to MetaMask (Will switch to BSC)'}
              </button>
            </div>
          )}
        </div>
      </div>

      {status && (
        <div className={`status status-${statusType}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{status}</span>
            {statusType === 'error' && retryCount === 0 && (
              <button 
                onClick={() => {
                  setRetryCount(0);
                  if (isConnected) {
                    retryOperation(addTokenToMetaMask, 'Add Token to MetaMask');
                  } else {
                    retryOperation(connectWallet, 'Connect Wallet');
                  }
                }}
                style={{
                  marginLeft: '10px',
                  padding: '5px 10px',
                  backgroundColor: '#009393',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Retry
              </button>
            )}
          </div>
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
    </ErrorBoundary>
  );
}

export default App;
