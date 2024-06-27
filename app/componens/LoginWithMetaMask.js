"use client";

import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import styles from './LoginWithMetaMask.module.css';
import abi from './abi.json';

const LoginWithMetaMask = () => {
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState(null);
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [newBalance, setNewBalance] = useState(null);
    const [notification, setNotification] = useState('');
    const [delegateAddress, setDelegateAddress] = useState('');
    const [transferToAddress, setTransferToAddress] = useState('');
    const [senderAddress, setSenderAddress] = useState('');

    useEffect(() => {
        const mintFunction = abi.find(item => item.name === 'mint');
        console.log('mint function:', mintFunction);

        if (mintFunction) {
            mintFunction.inputs.forEach((input, index) => {
                console.log(`${index}:`);
                console.log(input);
            });
        }
    }, []);

    useEffect(() => {
        if (account) {
            getAccountBalance(account);
        }
    }, [account]);

    useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
        }

        return () => {
            if (typeof window.ethereum !== 'undefined') {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, []);

    const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
            setAccount(null);
            setBalance(null);
            setNewBalance(null);
        } else {
            setAccount(accounts[0]);
        }
    };

    const loginWithMetaMask = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
            } catch (error) {
                console.error('User denied account access or there was an error:', error);
                setErrorMessage('Could not log in to MetaMask');
            }
        } else {
            setErrorMessage('MetaMask is not installed!');
        }
    };

    const logoutFromMetaMask = () => {
        setAccount(null);
        setBalance(null);
        setNewBalance(null);
        setErrorMessage('');

        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
                .then(() => {
                    window.location.reload();
                })
                .catch((error) => {
                    console.error('Error logging out:', error);
                    setErrorMessage('Could not log out from MetaMask');
                });
        }
    };

    const getAccountBalance = async (account) => {
        try {
            const web3 = new Web3(window.ethereum);
            const balance = await web3.eth.getBalance(account);
            setBalance(web3.utils.fromWei(balance, 'ether'));
        } catch (error) {
            console.error('Error getting balance:', error);
            setErrorMessage('Could not get balance');
        }
    };

    const sendTransaction = async () => {
        if (senderAddress && recipient && amount) {
            try {
                const web3 = new Web3(window.ethereum);
                const value = web3.utils.toWei(amount, 'ether');
    
                // Check if the sender address is authorized
                const accounts = await web3.eth.getAccounts();
                if (!accounts.includes(senderAddress)) {
                    setErrorMessage('Sender address is not authorized. Please check your MetaMask account.');
                    return;
                }
    
                await web3.eth.sendTransaction({
                    from: senderAddress, // Account B
                    to: recipient, // Account C
                    value
                });
    
                const balance = await web3.eth.getBalance(account);
                setNewBalance(web3.utils.fromWei(balance, 'ether'));
    
                setErrorMessage('');
                showNotification('Transaction successful!');
    
            } catch (error) {
                console.error('Transaction failed:', error);
                if (error.message.includes('User denied')) {
                    setErrorMessage('Transaction failed! User denied the transaction.');
                } else if (error.message.includes('not been authorized')) {
                    setErrorMessage('Transaction failed! The requested account and/or method has not been authorized by the user.');
                } else {
                    setErrorMessage('Transaction failed!');
                }
            }
        } else {
            setErrorMessage('Please enter a valid sender, recipient, and amount.');
        }
    };
    

    const callMintFunction = async () => {
        if (!account) {
            setErrorMessage('Please login with MetaMask to mint tokens.');
            return;
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            setErrorMessage('Please enter a valid amount to mint.');
            return;
        }

        if (typeof window.ethereum === 'undefined') {
            setErrorMessage('MetaMask is not installed!');
            return;
        }

        try {
            const web3 = new Web3(window.ethereum);
            const contractAddress = '0x9d6577f76A43cD29dFa3be2198e655104B7F91D2'; // Replace with your contract address
            const contract = new web3.eth.Contract(abi, contractAddress);

            // Convert the amount to Wei
            const amountInWei = web3.utils.toWei(amount, 'ether');

            // Estimate gas for the mint function
            // const gasEstimate = await contract.methods.mint(account, amountInWei).estimateGas({ from: account });
            // console.log('Gas estimate for mint function:', gasEstimate);

            // Call the mint function
            const result = await contract.mint(account, amountInWei);

            console.log('Mint function result:', result);
            setErrorMessage('');
            showNotification('Tokens minted successfully!');

        } catch (error) {
            console.error('Error calling mint function:', error);
            setErrorMessage(`Failed to mint tokens! Error: ${error.message}`);
        }
    };

    const showNotification = (message) => {
        setNotification(message);
        setTimeout(() => {
            setNotification('');
        }, 3000); // Hide notification after 3 seconds
    };

    const getBlockDetails = async (blockNumber) => {
        const web3 = new Web3(window.ethereum);
        try {
            const block = await web3.eth.getBlock(blockNumber);
            console.log(block);
        } catch (error) {
            console.error('Error getting block details:', error);
        }
    };

    const getERC20Balance = async (tokenAddress, walletAddress) => {
        const web3 = new Web3(window.ethereum);
        const minABI = [
            {
                "constant": true,
                "inputs": [{ "name": "_owner", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "name": "balance", "type": "uint256" }],
                "type": "function"
            }
        ];

        const contract = new web3.eth.Contract(minABI, tokenAddress);
        try {
            const balance = await contract.methods.balanceOf(walletAddress).call();
            console.log(web3.utils.fromWei(balance));
        } catch (error) {
            console.error('Error getting ERC-20 token balance:', error);
        }
    };

    const approveDelegate = async () => {
        if (!delegateAddress || !amount || isNaN(amount) || amount <= 0) {
            setErrorMessage('Please enter a valid delegate address and amount.');
            return;
        }
    
        try {
            const web3 = new Web3(window.ethereum);
            const contractAddress = '0xAd771c192131Bca4Ac1e5765C90891cE23D795a9'; // Replace with your ERC-20 token contract address
            const contract = new web3.eth.Contract(abi, contractAddress);
            const amountInWei = web3.utils.toWei(20, 'ether');
    
            // Check the current allowance
            const currentAllowance = await contract.methods.allowance(account, delegateAddress).call();
            console.log('Current Allowance:', web3.utils.fromWei(currentAllowance, 'ether'));
    
            // Estimate gas for the approve function
            const gasEstimate = await contract.methods.approve(delegateAddress, amountInWei).estimateGas({ from: account });
            console.log('Gas estimate for approve function:', gasEstimate);
    
            // Call the approve function
            const result = await contract.methods.approve(delegateAddress, amountInWei).send({
                from: account,
                gas: gasEstimate
            });
    
            console.log('Approve delegate result:', result);
            setErrorMessage('');
            showNotification('Delegate approved successfully!');
    
        } catch (error) {
            console.error('Error approving delegate:', error);
            setErrorMessage(`Failed to approve delegate! Error: ${error.message}`);
        }
    };
    
    
    const formatBalance = (balance) => {
        if (balance === null) return '0.00';
        return parseFloat(balance).toFixed(2);
    };

    return (
        <div className={styles.container}>
            {notification && <div className={styles.notification}>{notification}</div>}
            {account ? (
                <>
                    <div className={styles.info}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" className={styles.logo} alt="MetaMask Logo" />
                        <button className={styles.button} onClick={logoutFromMetaMask}>Logout</button>
                    </div>

                    <div className={styles.infoContainer}>
                        <div className={styles.infoItem}>
                            <strong>Account:</strong> {account}
                        </div>
                        <div className={styles.infoItem}>
                            <strong>Balance:</strong> {formatBalance(newBalance !== null ? newBalance : balance)} ZETA
                        </div>
                        <div className={styles.transactionContainer}>
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="Sender Address (Account B)"
                                value={senderAddress}
                                onChange={(e) => setSenderAddress(e.target.value)}
                            />
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="Recipient Address (Account C)"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                            />
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="Amount in ZETA"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            <button className={styles.button} onClick={sendTransaction}>Send ZETA</button>
                            <button className={styles.button} onClick={callMintFunction}>Mint Tokens</button>
                        </div>
                        <div className={styles.transactionContainer}>
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="Delegate Address"
                                value={delegateAddress}
                                onChange={(e) => setDelegateAddress(e.target.value)}
                            />
                            <button className={styles.button} onClick={approveDelegate}>Approve Delegate</button>
                        </div>
                    </div>
                </>
            ) : (
                <button className={styles.button} onClick={loginWithMetaMask}>Login with MetaMask</button>
            )}
            {errorMessage && <div className={styles.error}>{errorMessage}</div>}
        </div>
    );
};

export default LoginWithMetaMask;
