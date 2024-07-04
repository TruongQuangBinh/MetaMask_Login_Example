"use client";

import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import styles from './LoginWithMetaMask.module.css';
import abi from './abi.json';

const contractAddress = '0x9d6577f76A43cD29dFa3be2198e655104B7F91D2';

const LoginWithMetaMask = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [mintAmount, setMintAmount] = useState(1);
  const [mintPrice, setMintPrice] = useState(0.01);
  const [gasLimit, setGasLimit] = useState(300000);
  const [errorMessage, setErrorMessage] = useState('');
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (account) {
      fetchAccountBalance(account);
    }

    // Lấy giá mint từ data (abi.json)
    setMintPrice(abi.mintPrice || 0.01);
    setGasLimit(abi.gasLimit || 300000);
  }, [account]);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setBalance(null);
    } else {
      setAccount(accounts[0]);
      fetchAccountBalance(accounts[0]);
    }
  };

  const loginWithMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        fetchAccountBalance(accounts[0]);
        setErrorMessage('');
      } catch (error) {
        console.error('Lỗi khi đăng nhập MetaMask:', error);
        setErrorMessage('Không thể đăng nhập vào MetaMask');
      }
    } else {
      setErrorMessage('MetaMask chưa được cài đặt!');
    }
  };

  const logoutFromMetaMask = () => {
    setAccount(null);
    setBalance(null);
    setErrorMessage('');
  };

  const fetchAccountBalance = async (account) => {
    try {
      const web3 = new Web3(window.ethereum);
      const balance = await web3.eth.getBalance(account);
      setBalance(web3.utils.fromWei(balance, 'ether'));
    } catch (error) {
      console.error('Lỗi khi lấy số dư tài khoản:', error);
      setErrorMessage('Không thể lấy số dư tài khoản');
    }
  };

  const sendTransaction = async () => {
    if (!account || !recipient || !amount || isNaN(amount) || amount <= 0) {
      setErrorMessage('Vui lòng nhập thông tin người nhận và số tiền hợp lệ.');
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const value = web3.utils.toWei(amount, 'ether');
      const gasLimit = 21000; // Giới hạn gas cho giao dịch chuyển tiền

      const result = await web3.eth.sendTransaction({
        from: account,
        to: recipient,
        value: value,
        gas: gasLimit,
      });

      console.log('Kết quả giao dịch:', result);
      setErrorMessage('');
      showNotification('Giao dịch thành công!');
      fetchAccountBalance(account); // Cập nhật số dư tài khoản sau khi gửi giao dịch
    } catch (error) {
      console.error('Lỗi khi thực hiện giao dịch:', error);
      if (error.message.includes('User denied')) {
        setErrorMessage('Giao dịch bị từ chối bởi người dùng.');
      } else {
        setErrorMessage('Giao dịch thất bại!');
      }
    }
  };

  const mint = async () => {
    if (!account) {
      setErrorMessage('Vui lòng đăng nhập bằng MetaMask trước khi mint token.');
      return;
    }

    if (mintAmount <= 0 || mintAmount > 100) {
      setErrorMessage('Số lượng token mint phải trong khoảng 1 đến 100.');
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(abi, contractAddress);
      const value = web3.utils.toWei((mintAmount * mintPrice).toString(), 'ether');

      const gasPrice = await web3.eth.getGasPrice();
      const estimatedGas = await contract.methods.mint(mintAmount, account).estimateGas({
        from: account,
        value: value,
      });

      const result = await contract.methods.mint(mintAmount, account).send({
        from: account,
        value: value,
        gas: estimatedGas,
        gasPrice: gasPrice,
      });

      console.log('Kết quả mint token:', result);
      setErrorMessage('');
      showNotification(`Mint thành công ${mintAmount} ULT!`);
      fetchAccountBalance(account); // Cập nhật số dư tài khoản sau khi mint token
    } catch (error) {
      console.error('Lỗi khi mint token:', error);
      if (error.message.includes('User denied')) {
        setErrorMessage('Mint token bị từ chối bởi người dùng.');
      } else {
        setErrorMessage('Mint token thất bại!');
      }
    }
  };

  const formatBalance = (balance) => {
    if (balance === null) return '0.00';
    return parseFloat(balance).toFixed(2);
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification('');
    }, 3000);
  };

  return (
    <div className={styles.container}>
      {notification && <div className={styles.notification}>{notification}</div>}
      {account ? (
        <div className={styles.info}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" className={styles.logo} alt="MetaMask Logo" />
          <div>
            <p>Tài khoản: {account}</p>
            <p>Số dư: {formatBalance(balance)} ZETA</p>
            <input
              className={styles.input}
              type="text"
              placeholder="Địa chỉ người nhận"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              className={styles.input}
              type="text"
              placeholder="Số tiền"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button className={styles.button} onClick={sendTransaction}>Gửi Giao Dịch</button>
            <button className={styles.button} onClick={logoutFromMetaMask}>Đăng Xuất</button>
          </div>
        </div>
      ) : (
        <div className={styles.info}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" className={styles.logo} alt="MetaMask Logo" />
          <button className={styles.button} onClick={loginWithMetaMask}>Đăng Nhập bằng MetaMask</button>
          {errorMessage && <div className={styles.error}>{errorMessage}</div>}
        </div>
      )}
      <div className={styles.mint}>
            <h3>Mint Token</h3>
            <input
              className={styles.input}
              type="number"
              placeholder="Số lượng token"
              value={mintAmount}
              onChange={(e) => setMintAmount(parseInt(e.target.value))}
            />
            <p>Giá mint: {mintPrice} ULT</p>
            <p>Giới hạn gas: {gasLimit}</p>
            <button className={styles.button} onClick={mint}>Mint Token</button>
            {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      </div>
      </div>
  );
};

export default LoginWithMetaMask;
