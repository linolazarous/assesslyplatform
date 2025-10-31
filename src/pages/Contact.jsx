const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      alert('Message sent successfully!');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } else {
      alert(data.message || 'Failed to send message.');
    }
  } catch (error) {
    console.error('Error sending contact form:', error);
    alert('An unexpected error occurred. Please try again.');
  }
};
