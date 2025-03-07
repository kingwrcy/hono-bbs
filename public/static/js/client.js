/**
 * Timestamp Converter
 * 
 * This script finds all elements with the data-timestamp attribute
 * and converts their UTC timestamps to local time in the format yyyy/MM/dd HH:mm:ss
 */
document.addEventListener('DOMContentLoaded', function() {
  // Find all elements with data-timestamp attribute
  const timestampElements = document.querySelectorAll('[data-timestamp]');
  
  // Format function to ensure numbers have leading zeros when needed
  const formatNumber = (num) => num.toString().padStart(2, '0');
  
  // Process each element
  timestampElements.forEach(element => {
    const utcTimestamp = element.getAttribute('data-timestamp');
    
    if (utcTimestamp) {
      // Create a Date object from the UTC timestamp
      // Add 'Z' to indicate UTC if it's not already there
      const date = new Date(utcTimestamp.endsWith('Z') ? utcTimestamp : utcTimestamp + 'Z');
      
      // Format the date as yyyy/MM/dd HH:mm:ss
      const year = date.getFullYear();
      const month = formatNumber(date.getMonth() + 1); // getMonth() is 0-indexed
      const day = formatNumber(date.getDate());
      const hours = formatNumber(date.getHours());
      const minutes = formatNumber(date.getMinutes());
      const seconds = formatNumber(date.getSeconds());
      
      const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
      
      // Update the element's text content
      element.textContent = formattedDate;
    }
  });
  
  /**
   * 防重复提交功能
   * 
   * 为所有表单添加防重复提交功能，防止用户多次点击提交按钮
   */
  
  // 配置不同表单的提交按钮文本
  const formConfig = {
    // 发帖表单
    'post-form': {
      loadingText: '发布中...',
      originalText: '发布'
    },
    // 评论表单
    'comment-form': {
      loadingText: '提交中...',
      originalText: '提交评论'
    },
    // 注册表单
    'reg-form': {
      loadingText: '注册中...',
      originalText: '注册'
    },
    // 登录表单
    'login-form': {
      loadingText: '登录中...',
      originalText: '登录'
    },
    // 编辑帖子表单
    'edit-post-form': {
      loadingText: '更新中...',
      originalText: '更新'
    },
    // 编辑评论表单
    'edit-comment-form': {
      loadingText: '更新中...',
      originalText: '更新'
    }
  };
  
  // 为所有表单添加防重复提交功能
  document.querySelectorAll('form').forEach(form => {
    // 获取表单ID
    const formId = form.id;
    // 获取提交按钮
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (!submitButton) return;
    
    // 获取按钮配置，如果没有特定配置则使用默认值
    const config = formConfig[formId] || {
      loadingText: '提交中...',
      originalText: submitButton.textContent || '提交'
    };
    
    // 保存原始按钮文本
    const originalText = config.originalText;
    
    // 添加表单提交事件监听器
    form.addEventListener('submit', function(e) {
      // 如果按钮已被禁用，阻止提交
      if (submitButton.disabled) {
        e.preventDefault();
        return;
      }
      
      // 禁用按钮并更改文本
      submitButton.disabled = true;
      submitButton.textContent = config.loadingText;
      
      // 设置超时，防止网络问题导致按钮永久禁用
      setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }, 10000); // 10秒后恢复按钮状态
    });
  });  
});
