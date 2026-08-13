import React, { useState, useEffect } from 'react';
import { 
  Phone, Lock, User, Plus, MapPin, Calendar, AlertTriangle, 
  CheckCircle, Download, Home, Clock, ArrowLeft, Trash2, 
  Edit, Play, Check, List, Bell, FileText, ChevronRight, LogOut 
} from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ecozza_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState(() => {
    const savedUser = localStorage.getItem('ecozza_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      return u.role === 'operator' ? 'OPERATOR_DASHBOARD' : 'CUSTOMER_HOME';
    }
    return 'LANDING';
  });

  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verification & Temp States
  const [loginPhone, setLoginPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // Forms States
  const [propName, setPropName] = useState('');
  const [propType, setPropType] = useState('Residential (1,000 to 5,000 Liters)');
  const [propAddress, setPropAddress] = useState('');
  const [propCity, setPropCity] = useState('');
  const [propDistrict, setPropDistrict] = useState('');
  const [propState, setPropState] = useState('');
  const [propMapsUrl, setPropMapsUrl] = useState('');
  const [propLat, setPropLat] = useState(12.9716);
  const [propLon, setPropLon] = useState(77.5946);
  const [editingPropId, setEditingPropId] = useState(null);

  // Booking Service States
  const [bookPropertyId, setBookPropertyId] = useState('');
  const [bookType, setBookType] = useState('Residential (1 - 5 K Liters)');
  const [bookDate, setBookDate] = useState('2026-08-16');
  const [bookUrgent, setBookUrgent] = useState(false);

  // Operator Action Dialog States
  const [inspectBooking, setInspectBooking] = useState(null);
  const [auditCapacity, setAuditCapacity] = useState('');
  const [auditTanks, setAuditTanks] = useState('1');
  const [auditDimensions, setAuditDimensions] = useState('');
  const [auditPipe, setAuditPipe] = useState('');
  const [auditElectricity, setAuditElectricity] = useState(true);

  const [completeBooking, setCompleteBooking] = useState(null);
  const [recoveryWaste, setRecoveryWaste] = useState('');
  const [recoverySolid, setRecoverySolid] = useState('');
  const [recoveryLiquid, setRecoveryLiquid] = useState('');

  // Active view states
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [activeQuote, setActiveQuote] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [customerTab, setCustomerTab] = useState(0); // 0: Ongoing, 1: History
  const [operatorTab, setOperatorTab] = useState(0); // 0: Inspections, 1: Treatments, 2: History
  const [showNotifications, setShowNotifications] = useState(false);

  // Sync details when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('ecozza_user', JSON.stringify(user));
      loadAllData();
    } else {
      localStorage.removeItem('ecozza_user');
      setProperties([]);
      setBookings([]);
      setNotifications([]);
    }
  }, [user]);

  // Live polling for updates (every 4 seconds)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadAllData();
    }, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (user.role === 'customer') {
        const [propsRes, bookingsRes, notifsRes] = await Promise.all([
          fetch(`${API_BASE}/properties/user/${user._id}`),
          fetch(`${API_BASE}/bookings/user/${user._id}`),
          fetch(`${API_BASE}/notifications/user/${user._id}`)
        ]);
        setProperties(await propsRes.json());
        setBookings(await bookingsRes.json());
        setNotifications(await notifsRes.json());
      } else {
        const [bookingsRes, propsAllRes] = await Promise.all([
          fetch(`${API_BASE}/operator/bookings`),
          // Fetch properties to map address details in queue
          fetch(`${API_BASE}/operator/bookings`) // placeholder call or load all properties if we want
        ]);
        const bookingsList = await bookingsRes.json();
        setBookings(bookingsList);
        // For operator, fetch all properties to map
        const allPropsRes = await fetch(`${API_BASE}/properties/user/${user._id}`); // load user's properties (dummy) or properties from all users
        // Since it's a prototype, operators get all properties by fetching the global list, or we load them from bookings
        const loadedProps = [];
        for (const b of bookingsList) {
          try {
            const propRes = await fetch(`${API_BASE}/properties/user/${b.userId}`);
            const pList = await propRes.json();
            loadedProps.push(...pList);
          } catch(e){}
        }
        setProperties(loadedProps);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to synchronize data with server.');
    }
    setIsLoading(false);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  /* ================= AUTHENTICATION ACTIONS ================= */

  const handleSendOtp = async (phone) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) {
      showError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${clean}` })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setLoginPhone(`+91${clean}`);
        alert(`Verification OTP sent: ${data.otpSimulated} (Use this code to verify)`);
      } else {
        showError(data.error);
      }
    } catch (err) {
      showError('Failed to send OTP message.');
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, code: otpCode })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.profileRequired) {
          setView('PROFILE_SETUP');
        } else {
          setUser(data.user);
          setView('CUSTOMER_HOME');
        }
      } else {
        showError(data.error);
      }
    } catch (err) {
      showError('OTP Verification failed.');
    }
    setIsLoading(false);
  };

  const handleRegisterProfile = async () => {
    if (!regName.trim()) {
      showError('Please enter your full name.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, name: regName, email: regEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setView('CUSTOMER_HOME');
      } else {
        showError(data.error);
      }
    } catch (err) {
      showError('Failed to register account.');
    }
    setIsLoading(false);
  };

  const handleOperatorLogin = async (employeeId, password) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/operator-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setView('OPERATOR_DASHBOARD');
      } else {
        showError(data.error);
      }
    } catch (err) {
      showError('Operator login failed.');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    setView('LOGIN');
    setOtpSent(false);
    setOtpCode('');
  };

  /* ================= PROPERTIES CRUD ACTIONS ================= */

  const handleLocateGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setPropLat(lat);
        setPropLon(lon);
        setPropMapsUrl(`https://www.google.com/maps?q=${lat},${lon}`);
        alert('Live GPS location successfully captured!');
      },
      (error) => {
        console.warn('Geolocation access failed. Using simulated fallback.', error);
        const lat = 12.9716 + (Math.random() - 0.5) * 0.05;
        const lon = 77.5946 + (Math.random() - 0.5) * 0.05;
        setPropLat(lat);
        setPropLon(lon);
        setPropMapsUrl(`https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`);
        alert('Could not get live coordinates. Fallback simulated coordinates set!');
      }
    );
  };

  const handleSaveProperty = async (e) => {
    e.preventDefault();
    if (!propName.trim() || !propAddress.trim() || !propCity.trim() || !propDistrict.trim() || !propState.trim()) {
      showError('Property name, detailed address, city, district, and state are required.');
      return;
    }
    setIsLoading(true);
    try {
      const body = {
        userId: user._id,
        name: propName,
        type: propType,
        address: propAddress,
        city: propCity,
        district: propDistrict,
        state: propState,
        latitude: propLat,
        longitude: propLon,
        googleMapsUrl: propMapsUrl
      };
      let res;
      if (editingPropId) {
        res = await fetch(`${API_BASE}/properties/${editingPropId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`${API_BASE}/properties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      if (res.ok) {
        await loadAllData();
        setView('CUSTOMER_HOME');
        // Reset state
        setPropName('');
        setPropAddress('');
        setPropCity('');
        setPropDistrict('');
        setPropState('');
        setPropMapsUrl('');
        setPropLat(12.9716);
        setPropLon(77.5946);
        setEditingPropId(null);
      } else {
        showError('Failed to save property.');
      }
    } catch (err) {
      showError('Error saving property details.');
    }
    setIsLoading(false);
  };

  const handleDeleteProperty = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/properties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadAllData();
      } else {
        showError('Failed to delete property.');
      }
    } catch (err) {
      showError('Error deleting property.');
    }
    setIsLoading(false);
  };

  const handleEditPropertyClick = (prop) => {
    setPropName(prop.name);
    setPropType(prop.type);
    setPropAddress(prop.address);
    setPropCity(prop.city || '');
    setPropDistrict(prop.district || '');
    setPropState(prop.state || '');
    setPropMapsUrl(prop.googleMapsUrl || '');
    setPropLat(prop.latitude || 12.9716);
    setPropLon(prop.longitude || 77.5946);
    setEditingPropId(prop._id);
    setView('ADD_PROPERTY');
  };

  /* ================= BOOKINGS & CUSTOMER ACTIONS ================= */

  const handleBookService = async (e) => {
    e.preventDefault();
    if (!bookPropertyId) {
      showError('Please select a property to book a service.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          propertyId: bookPropertyId,
          bookingType: bookType,
          siteVisitDate: bookDate,
          isUrgent: bookUrgent
        })
      });
      if (res.ok) {
        await loadAllData();
        setView('CUSTOMER_HOME');
      } else {
        showError('Failed to schedule service request.');
      }
    } catch (err) {
      showError('Error booking inspection visit.');
    }
    setIsLoading(false);
  };

  const handleTrackBookingDetails = async (bookingId) => {
    setIsLoading(true);
    setSelectedBookingId(bookingId);
    try {
      const [quoteRes, recordRes] = await Promise.all([
        fetch(`${API_BASE}/quotes/booking/${bookingId}`),
        fetch(`${API_BASE}/service-records/booking/${bookingId}`)
      ]);
      setActiveQuote(quoteRes.ok ? await quoteRes.json() : null);
      setActiveRecord(recordRes.ok ? await recordRes.json() : null);
      setView('BOOKING_STATUS');
    } catch (err) {
      showError('Failed to fetch tracking details.');
    }
    setIsLoading(false);
  };

  const handleAcceptQuote = async (quoteId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotes/${quoteId}/accept`, { method: 'POST' });
      if (res.ok) {
        await handleTrackBookingDetails(selectedBookingId);
        await loadAllData();
      } else {
        showError('Failed to approve quotation.');
      }
    } catch (err) {
      showError('Error approving quotation.');
    }
    setIsLoading(false);
  };

  const handleDeclineQuote = async (quoteId) => {
    if (!confirm('Are you sure you want to decline this quote?')) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotes/${quoteId}/decline`, { method: 'POST' });
      if (res.ok) {
        await handleTrackBookingDetails(selectedBookingId);
        await loadAllData();
      } else {
        showError('Failed to decline quotation.');
      }
    } catch (err) {
      showError('Error declining quotation.');
    }
    setIsLoading(false);
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch(e){}
  };

  /* ================= OPERATOR PORTAL ACTIONS ================= */

  const handleAcceptBookingRequest = async (bookingId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/operator/bookings/${bookingId}/accept`, {
        method: 'POST'
      });
      if (res.ok) {
        await loadAllData();
        alert('Site visit request accepted.');
      } else {
        showError('Failed to accept booking request.');
      }
    } catch (err) {
      showError('Error accepting booking.');
    }
    setIsLoading(false);
  };

  const handleScheduleBooking = async (bookingId, treatmentDate) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/operator/bookings/${bookingId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatmentDate })
      });
      if (res.ok) {
        await loadAllData();
        alert('Service de-sludging scheduled.');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to schedule service.');
      }
    } catch (err) {
      showError('Error scheduling service.');
    }
    setIsLoading(false);
  };

  const handleSubmitAssessment = async (auditData) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/operator/bookings/${inspectBooking._id}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditData)
      });
      if (res.ok) {
        await loadAllData();
        setInspectBooking(null);
        alert('Site inspection recorded and day-wise quote dispatched to customer.');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to submit inspection details.');
      }
    } catch (err) {
      showError('Error submitting site audit.');
    }
    setIsLoading(false);
  };

  const handleStartDesludging = async (id) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/operator/bookings/${id}/start`, { method: 'POST' });
      if (res.ok) {
        await loadAllData();
        alert('Work in progress on-site.');
      } else {
        showError('Failed to start desludging.');
      }
    } catch (err) {
      showError('Error starting desludging.');
    }
    setIsLoading(false);
  };

  const handleCompleteDesludging = async () => {
    const waste = parseInt(recoveryWaste);
    const solid = parseInt(recoverySolid);
    const liquid = parseInt(recoveryLiquid);

    if (isNaN(waste) || isNaN(solid) || isNaN(liquid)) {
      showError('Please enter valid recovery outcome numbers.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/operator/bookings/${completeBooking._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wasteProcessed: waste,
          biochar: solid,
          water: liquid
        })
      });
      if (res.ok) {
        await loadAllData();
        setCompleteBooking(null);
        alert('Septic service complete. Service completion letter issued.');
      } else {
        showError('Failed to log zero-waste outcomes.');
      }
    } catch (err) {
      showError('Error recording recycling outcomes.');
    }
    setIsLoading(false);
  };


  /* ================= SUB-VIEW RENDERING CONTROLLERS ================= */

  // Header Bar Composable Component
  const renderHeader = () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return (
      <header className="header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: '#ffffff',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        {/* Official logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => {
          if (user) {
            setView(user.role === 'operator' ? 'OPERATOR_DASHBOARD' : 'CUSTOMER_HOME');
          } else {
            setView('LANDING');
          }
        }}>
          <img src="/logo.png" alt="Ecozza Green" style={{ height: '65px', objectFit: 'contain' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && user.role === 'customer' && (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#f1f5f2', color: 'var(--text-primary)' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '0', right: '0', backgroundColor: 'var(--danger)',
                    color: '#ffffff', fontSize: '10px', borderRadius: '50%', padding: '2px 6px',
                    fontWeight: 'bold'
                  }}>{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute', right: 0, marginTop: '8px', width: '280px',
                  backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)', padding: '12px', zIndex: 110,
                  maxHeight: '300px', overflowY: 'auto'
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Notifications</h4>
                  {notifications.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', padding: '8px 0' }}>No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n._id}
                        onClick={() => handleMarkNotificationRead(n._id)}
                        style={{
                          padding: '8px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer',
                          backgroundColor: n.isRead ? '#ffffff' : 'var(--primary-light)', borderRadius: '6px'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{n.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{n.body}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {user && (
            <button 
              onClick={handleLogout}
              style={{
                padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: 'var(--danger-light)', color: 'var(--danger)'
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>
      </header>
    );
  };

  return (
    <div className="app-container">
      {view !== 'LOGIN' && view !== 'LANDING' && renderHeader()}

      {/* Main Container Views switcher */}
      <main style={{ flex: 1, padding: view === 'LANDING' ? '0' : '20px', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <div style={{
            padding: '12px 16px', backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)',
            borderRadius: '12px', color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold',
            marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* View switcher */}
        {view === 'LANDING' && (
          <LandingPageView onAction={() => setView('LOGIN')} />
        )}

        {view === 'LOGIN' && (
          <div className="auth-wrapper animate-fade-in">
            <LoginView 
              onSendOtp={handleSendOtp}
              onVerifyOtp={handleVerifyOtp}
              onOperatorLogin={handleOperatorLogin}
              otpSent={otpSent}
              otpCode={otpCode}
              setOtpCode={setOtpCode}
              isLoading={isLoading}
              onBackToWebsite={() => setView('LANDING')}
            />
          </div>
        )}

        {view === 'PROFILE_SETUP' && (
          <div className="auth-wrapper animate-fade-in">
            <ProfileSetupView 
              regName={regName}
              setRegName={setRegName}
              regEmail={regEmail}
              setRegEmail={setRegEmail}
              onRegister={handleRegisterProfile}
              isLoading={isLoading}
            />
          </div>
        )}

        {view === 'CUSTOMER_HOME' && (
          <CustomerHomeView 
            user={user}
            properties={properties}
            bookings={bookings}
            customerTab={customerTab}
            setCustomerTab={setCustomerTab}
            onAddProperty={() => {
              // Reset edit state
              setPropName('');
              setPropAddress('');
              setPropMapsUrl('');
              setEditingPropId(null);
              setView('ADD_PROPERTY');
            }}
            onBookService={() => {
              if (properties.length === 0) {
                alert('Please add a property first.');
                return;
              }
              setBookPropertyId(properties[0]._id);
              setBookType(properties[0].type);
              setView('BOOK_SERVICE');
            }}
            onEditProperty={handleEditPropertyClick}
            onDeleteProperty={handleDeleteProperty}
            onTrackBooking={handleTrackBookingDetails}
          />
        )}

        {view === 'ADD_PROPERTY' && (
          <AddPropertyView 
            propName={propName}
            setPropName={setPropName}
            propType={propType}
            setPropType={setPropType}
            propAddress={propAddress}
            setPropAddress={setPropAddress}
            propCity={propCity}
            setPropCity={setPropCity}
            propDistrict={propDistrict}
            setPropDistrict={setPropDistrict}
            propState={propState}
            setPropState={setPropState}
            propMapsUrl={propMapsUrl}
            setPropMapsUrl={setPropMapsUrl}
            editingPropId={editingPropId}
            onLocate={handleLocateGps}
            onSave={handleSaveProperty}
            onCancel={() => setView('CUSTOMER_HOME')}
            isLoading={isLoading}
          />
        )}

        {view === 'BOOK_SERVICE' && (
          <BookServiceView 
            properties={properties}
            bookPropertyId={bookPropertyId}
            setBookPropertyId={setBookPropertyId}
            bookType={bookType}
            setBookType={setBookType}
            bookDate={bookDate}
            setBookDate={setBookDate}
            bookUrgent={bookUrgent}
            setBookUrgent={setBookUrgent}
            onBook={handleBookService}
            onCancel={() => setView('CUSTOMER_HOME')}
            isLoading={isLoading}
          />
        )}

        {view === 'BOOKING_STATUS' && (
          <BookingStatusView 
            bookingId={selectedBookingId}
            bookings={bookings}
            properties={properties}
            quote={activeQuote}
            record={activeRecord}
            onAccept={handleAcceptQuote}
            onDecline={handleDeclineQuote}
            onBack={() => setView('CUSTOMER_HOME')}
            isLoading={isLoading}
          />
        )}

        {view === 'OPERATOR_DASHBOARD' && (
          <OperatorDashboardView 
            user={user}
            bookings={bookings}
            properties={properties}
            operatorTab={operatorTab}
            setOperatorTab={setOperatorTab}
            inspectBooking={inspectBooking}
            setInspectBooking={setInspectBooking}
            completeBooking={completeBooking}
            setCompleteBooking={setCompleteBooking}
            
            // Dialog inputs
            auditCapacity={auditCapacity}
            setAuditCapacity={setAuditCapacity}
            auditTanks={auditTanks}
            setAuditTanks={setAuditTanks}
            auditDimensions={auditDimensions}
            setAuditDimensions={setAuditDimensions}
            auditPipe={auditPipe}
            setAuditPipe={setAuditPipe}
            auditElectricity={auditElectricity}
            setAuditElectricity={setAuditElectricity}
            onSubmitAudit={handleSubmitAssessment}

            recoveryWaste={recoveryWaste}
            setRecoveryWaste={setRecoveryWaste}
            recoverySolid={recoverySolid}
            setRecoverySolid={setRecoverySolid}
            recoveryLiquid={recoveryLiquid}
            setRecoveryLiquid={setRecoveryLiquid}
            onSubmitComplete={handleCompleteDesludging}

            onStartService={handleStartDesludging}
            onAcceptBookingRequest={handleAcceptBookingRequest}
            onScheduleBooking={handleScheduleBooking}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}

function LandingPageView({ onAction }) {
  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Background Ambient Glows */}
      <div className="glow-ambient"></div>
      <div className="glow-ambient-left"></div>

      {/* Navigation Header */}
      <nav className="landing-nav" style={{ padding: '8px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => handleScrollTo('hero')}>
          <img src="/logo.png" alt="Ecozza Green Logo" style={{ height: '70px', objectFit: 'contain' }} />
        </div>
        <div className="landing-nav-links">
          <a href="#about" onClick={(e) => { e.preventDefault(); handleScrollTo('about'); }} className="landing-nav-link">About Us</a>
          <a href="#technology" onClick={(e) => { e.preventDefault(); handleScrollTo('technology'); }} className="landing-nav-link">Technology</a>
          <a href="#products" onClick={(e) => { e.preventDefault(); handleScrollTo('products'); }} className="landing-nav-link">Products</a>
          <a href="#founders" onClick={(e) => { e.preventDefault(); handleScrollTo('founders'); }} className="landing-nav-link">Founder</a>
          <a href="#contact" onClick={(e) => { e.preventDefault(); handleScrollTo('contact'); }} className="landing-nav-link">Contact</a>
          <button className="btn-primary" onClick={onAction} style={{ padding: '8px 16px', fontSize: '13px', marginLeft: '12px' }}>
            Book Now
          </button>
          <button className="btn-secondary" onClick={onAction} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Login
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }} className="landing-nav-mobile-btn">
          <button className="btn-primary" onClick={onAction} style={{ padding: '8px 12px', fontSize: '12px' }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="landing-section-wrapper" style={{ padding: '60px 20px' }}>
        <div className="landing-grid-2">
          {/* Left Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div className="landing-badge" style={{ width: 'fit-content' }}>
              🌱 Waste Into Resource
            </div>
            
            <h1 style={{ fontSize: '42px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
              Turning Septic Sludge Into <span style={{ color: 'var(--primary)', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sustainable Value</span>
            </h1>
            
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Converting wet sewage sludge directly into high-value bioproducts with zero pre-drying technology inside a fully equipped mobile treatment factory. 
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
              <button className="btn-primary" onClick={onAction} style={{ padding: '14px 28px', fontSize: '15px' }}>
                Book Inspection Visit <ChevronRight size={16} />
              </button>
              <button className="btn-secondary" onClick={onAction} style={{ padding: '14px 28px', fontSize: '15px' }}>
                Sign In to Portal
              </button>
            </div>
          </div>

          {/* Right Hero Graphic */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '600px',
              border: '1px solid rgba(255,255,255,0.4)',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <img 
                src="/logo.png" 
                alt="Ecozza Circular Infinity Loop" 
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '420px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 12px 25px rgba(4,120,87,0.15))'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="landing-stats-bar" style={{ marginTop: '0', marginBottom: '40px' }}>
        <div className="landing-stat-item">
          <h3>On-Site</h3>
          <p>Treatment</p>
        </div>
        <div className="landing-stat-item">
          <h3>Zero</h3>
          <p>Landfill Dumping</p>
        </div>
        <div className="landing-stat-item">
          <h3>Eco-Safe</h3>
          <p>Bio-Conversion</p>
        </div>
        <div className="landing-stat-item">
          <h3>Circular</h3>
          <p>Resource Recovery</p>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="landing-section-wrapper" style={{ scrollMarginTop: '80px' }}>
        <div className="landing-grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>About Ecozza Green</span>
            <h2 style={{ fontSize: '32px', color: 'var(--primary-dark)', fontWeight: '900', lineHeight: '1.2' }}>
              Solving the Septic Sludge Crisis, On-Site
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Ecozza Green is a mobile septic waste treatment company founded in 2026 and based in Ahmedabad, Gujarat, India. We do this by bringing a complete on-site treatment solution directly to every property that needs it.
            </p>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Ecozza Green is not a waste disposal company. It is a circular economy company. Septic waste is our raw material, biochar and clean water are our products, and the mobile unit is our factory. Our tagline is: <strong>Turning Waste Into Value</strong>.
            </p>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '32px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ fontWeight: '800', color: 'var(--primary-dark)', fontSize: '18px' }}>Our Core Identity</h4>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px' }}>🚜</span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Mobile Factory:</strong> Zero transit cost or open dumping. All sludge is processed and reclaimed directly at your driveway.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px' }}>🌱</span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Biochar Soil Enhancement:</strong> Captures organic carbon and traps it inside soil structures for horticultural nourishment.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px' }}>💧</span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Recycled Water:</strong> Converts septic liquid into filtered, non-potable water returned to you for landscaping irrigation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="landing-section-wrapper" style={{ borderTop: '1px solid var(--border)', scrollMarginTop: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Closed-Loop Process</span>
          <h2 style={{ fontSize: '32px', marginTop: '8px', color: 'var(--primary-dark)', fontWeight: '900' }}>How Our Mobile Technology Works</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Operating directly in the liquid phase without massive solar drying beds or carbon-heavy incinerators.
          </p>
        </div>

        <div className="grid-responsive-3">
          <div className="flow-step-card">
            <div className="flow-step-number">1</div>
            <div>
              <h4 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>Raw Sewage Intake</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Sludge is vacuum-pumped directly from your septic tank manhole into the vehicle. Bypasses drying beds.
              </p>
            </div>
          </div>

          <div className="flow-step-card">
            <div className="flow-step-number">2</div>
            <div>
              <h4 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>Thermal Pasteurization</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Thermal pasteurization and recovery inside the mobile factory sanitizes the waste and separates organic matter.
              </p>
            </div>
          </div>

          <div className="flow-step-card">
            <div className="flow-step-number">3</div>
            <div>
              <h4 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>Recycled Outputs</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Produces organic biochar soil amendments and filtered garden irrigation water before leaving your premises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="landing-section-wrapper" style={{ borderTop: '1px solid var(--border)', scrollMarginTop: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Value Outputs</span>
          <h2 style={{ fontSize: '32px', marginTop: '8px', color: 'var(--primary-dark)', fontWeight: '900' }}>Our Clean-Tech Products</h2>
        </div>

        <div className="grid-responsive-2">
          {/* Product 1: Biochar */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff' }}>
            <span style={{ fontSize: '32px' }}>🌱</span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-dark)' }}>Biochar / Soil Enhancer</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              A stable, carbon-rich soil conditioner designed to restore microbial health and water retention in depleted agricultural or garden lands.
            </p>
            
            <div className="product-metric-grid">
              <div className="product-metric-item">
                <span>Carbon Content</span>
                <strong>High Organic C</strong>
              </div>
              <div className="product-metric-item">
                <span>Water Retention</span>
                <strong>2x Improvement</strong>
              </div>
            </div>

            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              <li>✅ Sequesters carbon safely in soil systems for hundreds of years.</li>
              <li>✅ Buffers pH levels and prevents artificial fertilizer chemical runoff.</li>
              <li>✅ Fosters deep microbial growth for lawn, trees, and ornamental crops.</li>
            </ul>
          </div>

          {/* Product 2: Treated Water */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff' }}>
            <span style={{ fontSize: '32px' }}>💧</span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-dark)' }}>Treated Irrigation Water</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Filter-processed, pathogen-free water returned directly to the customer site, preventing municipal sewage discharge.
            </p>

            <div className="product-metric-grid">
              <div className="product-metric-item">
                <span>Pathogen Level</span>
                <strong>0% (Neutralized)</strong>
              </div>
              <div className="product-metric-item">
                <span>Usage Fitness</span>
                <strong>Non-Potable / Garden</strong>
              </div>
            </div>

            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              <li>✅ Conserves local drinking groundwater resources.</li>
              <li>✅ Eliminates cost of purchasing tankers for plant irrigation.</li>
              <li>✅ Odor-free fluid fully compliant with regional environmental parameters.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section id="founders" className="landing-section-wrapper" style={{ borderTop: '1px solid var(--border)', scrollMarginTop: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Governance</span>
          <h2 style={{ fontSize: '32px', marginTop: '8px', color: 'var(--primary-dark)', fontWeight: '900' }}>Company Founders</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Ecozza Green Tech Solutions Private Limited
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Maharsh Soni (Founder) */}
          <div className="founder-bio-card" style={{ borderLeft: '6px solid var(--primary)' }}>
            <span className="founder-title-badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>Founder</span>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '6px' }}>Maharsh Soni</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '8px' }}>
              Founder of Ecozza Green. Handles both the front-end operations management and back-end clean engineering design processes, leading the circular waste-to-value system.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Dr. Devanshi Soni (Co-Founder) */}
            <div className="founder-bio-card">
              <span className="founder-title-badge">Co-Founder</span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '6px' }}>Dr. Devanshi Soni</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '8px' }}>
                Co-inventor and co-founder. Driving business deployment, operational integration, and municipal partnerships across Gujarat.
              </p>
            </div>

            {/* Anchal Shah (Co-Founder) */}
            <div className="founder-bio-card">
              <span className="founder-title-badge">Co-Founder</span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '6px' }}>Anchal Shah</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '8px' }}>
                Co-founder specializing in green clean-tech process design and thermal pasteurization reactor engineering.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="landing-section-wrapper" style={{ borderTop: '1px solid var(--border)', scrollMarginTop: '80px', marginBottom: '40px' }}>
        <div className="landing-grid-2">
          {/* Contact Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Get In Touch</span>
            <h2 style={{ fontSize: '32px', color: 'var(--primary-dark)', fontWeight: '900', lineHeight: '1.2' }}>
              Let's Build a Greener Economy Together
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Questions about scheduling desludging services, buying biochar soil conditioners, or partnering with our engineering team? Contact us.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              <div>
                <h5 style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>Call Us</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  📞 <a href="tel:7778028946" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '700' }}>+91 77780 28946</a>
                </p>
              </div>

              <div>
                <h5 style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>Email Us</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ✉️ <a href="mailto:ecozzagreen@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '700' }}>ecozzagreen@gmail.com</a>
                </p>
              </div>

              <div>
                <h5 style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>Our Locations</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  📍 <strong>Headquarters:</strong> Ahmedabad, Gujarat, India<br/>
                  📍 <strong>Operations:</strong> Halol Industrial Corridor, Panchmahal, Gujarat
                </p>
              </div>
            </div>
          </div>

          {/* Quick Contact Form Card */}
          <div className="card" style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontWeight: '800', fontSize: '18px', color: 'var(--primary-dark)' }}>Submit an Inquiry</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input type="text" placeholder="John Doe" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address</label>
                <input type="email" placeholder="john@company.com" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Message</label>
                <textarea placeholder="How can Ecozza Green assist you?" rows={2} />
              </div>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => alert('Thank you! Your inquiry was received. We will respond within 24 hours.')}
                style={{ width: '100%', marginTop: '6px' }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-logo">
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
            fontWeight: 'bold', fontSize: '16px'
          }}>♻</div>
          <span>ECOZZA GREEN</span>
        </div>
        <p style={{ fontSize: '13px', color: '#a7f3d0' }}>Turning Waste Into Value</p>
        
        {/* LinkedIn Link */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <a 
            href="https://www.linkedin.com/company/ecozzagreen/" 
            target="_blank" 
            rel="noreferrer" 
            style={{ 
              color: '#ffffff', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px', 
              textDecoration: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '6px 14px',
              borderRadius: '20px',
              transition: 'background 0.3s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg> Follow us on LinkedIn
          </a>
        </div>

        <p style={{ marginTop: '24px', fontSize: '11px', color: '#6ee7b7', opacity: 0.8 }}>
          © 2026 Ecozza Green Tech Solutions Pvt. Ltd. | Ahmedabad, Gujarat, India | Confidential
        </p>
      </footer>
    </div>
  );
}

function LoginView({ 
  onSendOtp, onVerifyOtp, onOperatorLogin, 
  otpSent, otpCode, setOtpCode, isLoading,
  onBackToWebsite
}) {
  const [isOfficial, setIsOfficial] = useState(false);
  const [phone, setPhone] = useState('');
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="auth-split-container animate-fade-in" style={{ width: '100%', maxWidth: '1000px', margin: 'auto' }}>
      {/* Left Column Hero Panel */}
      <div className="auth-hero-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Ecozza Green Logo" style={{ height: '80px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </div>

        <div style={{ margin: '40px 0' }}>
          <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: '800', marginBottom: '16px', lineHeight: '1.2' }}>
            Zero-Waste Sludge Recovery & Organic Bio-Recycling
          </h1>
          <p style={{ color: '#a7f3d0', fontSize: '15px', marginBottom: '28px', fontWeight: '500' }}>
            A circular economy platform converting domestic, commercial, and industrial septic waste into eco-safe recycled biochar and clean agricultural water.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>🌱</span>
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>100% Circular De-Sludging</h4>
                <p style={{ color: '#d1fae5', fontSize: '12px' }}>Domestic and industrial recovery turning organic waste into compost.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>Auto-Calculated Audits</h4>
                <p style={{ color: '#d1fae5', fontSize: '12px' }}>Visiting officials map dimensions and auto-calculate volume via laser math.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>🛡️</span>
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>Completion Letter</h4>
                <p style={{ color: '#d1fae5', fontSize: '12px' }}>Download your official service completion letter instantly.</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '20px', fontSize: '12px', color: '#a7f3d0' }}>
          <span>150,000L+ Waste Reclaimed</span>
          <span>Zero-Waste Certified</span>
        </div>
      </div>

      {/* Right Column Form Panel */}
      <div className="auth-form-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: 'var(--primary-dark)', fontWeight: '800', fontSize: '26px' }}>
              {isOfficial ? 'Official Portal' : 'Customer Portal'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {isOfficial ? 'Ecozza Environmental Board Sign In' : 'Sign in to schedule circular sludge recovery services'}
            </p>
          </div>
          {onBackToWebsite && (
            <button 
              className="btn-secondary" 
              onClick={onBackToWebsite} 
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', boxShadow: 'none' }}
            >
              ← Back
            </button>
          )}
        </div>

        {!isOfficial ? (
          // Customer login Phone/OTP form
          <div>
            {!otpSent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '600' }}>+91</span>
                    <input 
                      type="tel" 
                      placeholder="9876543210" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      style={{ paddingLeft: '52px' }}
                    />
                  </div>
                </div>

                <button className="btn-primary" onClick={() => onSendOtp(phone)} disabled={isLoading}>
                  <Phone size={18} /> Send OTP Verification
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-accent)', borderRadius: '10px', fontSize: '13px', color: 'var(--primary-dark)' }}>
                  Verification code simulated: <strong>123456</strong>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Verification OTP Code</label>
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit code" 
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value)} 
                  />
                </div>

                <button className="btn-primary" onClick={onVerifyOtp} disabled={isLoading}>
                  <CheckCircle size={18} /> Verify & Log In
                </button>
              </div>
            )}
          </div>
        ) : (
          // Operator login credentials form
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px 14px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-accent)', borderRadius: '10px', fontSize: '12px', color: 'var(--primary-dark)' }}>
              Operator Credentials: <strong>Secure Operations Access Panel. Use your assigned Employee ID.</strong>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Employee ID</label>
              <input 
                type="text" 
                placeholder="e.g. OP-9999" 
                value={empId} 
                onChange={e => setEmpId(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>

            <button className="btn-primary" onClick={() => onOperatorLogin(empId, password)} disabled={isLoading}>
              <Lock size={18} /> Operator Sign In
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <span 
            onClick={() => setIsOfficial(!isOfficial)} 
            style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            {isOfficial ? 'Customer login? Register / Access here' : 'Ecozza official operator portal'} <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

function ProfileSetupView({ regName, setRegName, regEmail, setRegEmail, onRegister, isLoading }) {
  return (
    <div className="card animate-fade-in" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
      <h2 style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '22px', marginBottom: '8px' }}>Create Profile</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Provide profile details to complete setup</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name</label>
          <input 
            type="text" 
            placeholder="e.g. John Doe" 
            value={regName} 
            onChange={e => setRegName(e.target.value)} 
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address (Optional)</label>
          <input 
            type="email" 
            placeholder="e.g. john@example.com" 
            value={regEmail} 
            onChange={e => setRegEmail(e.target.value)} 
          />
        </div>

        <button className="btn-primary" onClick={onRegister} disabled={isLoading}>
          <User size={18} /> Register Profile
        </button>
      </div>
    </div>
  );
}

function CustomerHomeView({
  user, properties, bookings, customerTab, setCustomerTab,
  onAddProperty, onBookService, onEditProperty, onDeleteProperty, onTrackBooking
}) {
  const ongoing = bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
  const past = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Premium Gradient Greet Header Banner */}
      <div style={{
        background: 'var(--gradient-brand)',
        padding: '32px 36px',
        borderRadius: 'var(--radius-lg)',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-brand)',
        flexWrap: 'wrap',
        gap: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative SVG backgrounds */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '20%', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        
        <div style={{ zIndex: 1 }}>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a7f3d0' }}>ECOZZA CIRCULAR SYSTEM</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>Hello, {user.name} 👋</h2>
          <p style={{ fontSize: '14px', color: '#d1fae5', marginTop: '6px', fontWeight: '500', maxWidth: '450px' }}>
            Book organic waste recovery, track site visit specs, and download service completion letters.
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={onBookService}
          style={{
            background: '#ffffff',
            color: 'var(--primary-dark)',
            padding: '14px 24px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            zIndex: 1
          }}
        >
          <Plus size={16} /> Book Recovery Service
        </button>
      </div>

      {/* Dashboard Responsive Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column: Ongoing & Past Bookings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Modern Pill Navigation Tabs */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#e2e8f0',
            padding: '4px',
            borderRadius: '12px',
            width: 'fit-content'
          }}>
            <button 
              onClick={() => setCustomerTab(0)}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: customerTab === 0 ? '#ffffff' : 'transparent',
                boxShadow: customerTab === 0 ? 'var(--shadow-sm)' : 'none',
                color: customerTab === 0 ? 'var(--primary-dark)' : 'var(--text-secondary)'
              }}
            >
              Ongoing Services ({ongoing.length})
            </button>
            <button 
              onClick={() => setCustomerTab(1)}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: customerTab === 1 ? '#ffffff' : 'transparent',
                boxShadow: customerTab === 1 ? 'var(--shadow-sm)' : 'none',
                color: customerTab === 1 ? 'var(--primary-dark)' : 'var(--text-secondary)'
              }}
            >
              Service History ({past.length})
            </button>
          </div>

          {/* Selected Tab List */}
          <div>
            {customerTab === 0 ? (
              ongoing.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '48px 16px', border: '2px dashed var(--border)',
                  borderRadius: '20px', color: 'var(--text-secondary)', backgroundColor: '#ffffff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                }}>
                  <span style={{ fontSize: '32px' }}>🍃</span>
                  <div style={{ fontWeight: '600' }}>No ongoing desludging requests</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', maxWidth: '280px' }}>
                    Need an audit? Click the Book Service button to schedule a site inspection visit.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {ongoing.map(b => {
                    const prop = properties.find(p => p._id === b.propertyId);
                    return (
                      <div key={b._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '5px solid var(--primary-accent)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ fontWeight: '800', fontSize: '17px' }}>{prop?.name || 'Property'}</h4>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              📍 {prop ? `${prop.city}, ${prop.state}` : ''}
                            </p>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '6px 12px',
                            backgroundColor: b.status === 'QUOTE_SENT' ? 'var(--warning-light)' : 'var(--primary-light)',
                            color: b.status === 'QUOTE_SENT' ? 'var(--warning)' : 'var(--primary)',
                            borderRadius: '8px',
                            letterSpacing: '0.5px'
                          }}>{b.status.replace('_', ' ')}</span>
                        </div>
                        <div className="grid-responsive-2" style={{ fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                          <div><strong>Range Type:</strong> {b.bookingType}</div>
                          <div><strong>Visit Date:</strong> {b.siteVisitDate}</div>
                        </div>
                        {b.status === 'QUOTE_SENT' && (
                          <div style={{
                            padding: '10px 14px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)',
                            fontSize: '12px', borderRadius: '10px', fontWeight: '700', border: '1px solid rgba(249, 115, 22, 0.1)',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}>
                            ⚠️ Cost Quotation Ready! Review invoice breakup to confirm treatment.
                          </div>
                        )}
                        <button className="btn-secondary" onClick={() => onTrackBooking(b._id)} style={{ padding: '10px 14px', fontSize: '13px', alignSelf: 'flex-start', marginTop: '4px' }}>
                          Track Progress & View Specs <ChevronRight size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              past.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '48px 16px', border: '2px dashed var(--border)',
                  borderRadius: '20px', color: 'var(--text-secondary)', backgroundColor: '#ffffff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                }}>
                  <span style={{ fontSize: '32px' }}>📁</span>
                  <div style={{ fontWeight: '600' }}>Service history empty</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    Completed services and certifications will be archived here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {past.map(b => {
                    const prop = properties.find(p => p._id === b.propertyId);
                    return (
                      <div key={b._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: '800', fontSize: '17px' }}>{prop?.name || 'Property'}</h4>
                          <span style={{
                            fontSize: '11px', fontWeight: '800', padding: '6px 12px',
                            backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', borderRadius: '8px'
                          }}>{b.status}</span>
                        </div>
                        <div className="grid-responsive-2" style={{ fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                          <div><strong>Range Type:</strong> {b.bookingType}</div>
                          <div><strong>Completion Date:</strong> {b.siteVisitDate}</div>
                        </div>
                        <button className="btn-secondary" onClick={() => onTrackBooking(b._id)} style={{ padding: '10px 14px', fontSize: '13px', alignSelf: 'flex-start', marginTop: '4px' }}>
                          View Completion Details <ChevronRight size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Properties List Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)' }}>My Properties</h3>
            <button className="btn-secondary" onClick={onAddProperty} style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px' }}>
              <Plus size={14} /> Add Property
            </button>
          </div>

          {properties.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 16px', border: '2px dashed var(--border)',
              borderRadius: '20px', color: 'var(--text-secondary)', backgroundColor: '#ffffff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
            }}>
              <span style={{ fontSize: '24px' }}>🏠</span>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>No registered properties</div>
              <p style={{ fontSize: '11px', color: 'var(--text-light)', maxWidth: '200px' }}>Add a property profile to schedule inspection bookings.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {properties.map(p => (
                <div key={p._id} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', overflow: 'hidden', marginRight: '8px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--primary-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0
                    }}><Home size={20} /></div>
                    <div style={{ overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{p.name}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', marginTop: '2px' }}>
                        📍 {p.city}, {p.state}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button 
                      onClick={() => onEditProperty(p)}
                      style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)' }}
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteProperty(p._id)}
                      style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddPropertyView({
  propName, setPropName, propType, setPropType, propAddress, setPropAddress,
  propCity, setPropCity, propDistrict, setPropDistrict, propState, setPropState,
  propMapsUrl, setPropMapsUrl, editingPropId, onLocate, onSave, onCancel, isLoading
}) {
  return (
    <div className="card animate-fade-in">
      <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>
        {editingPropId ? 'Edit Property Profile' : 'Add Property Profile'}
      </h2>

      <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Property Name</label>
          <input 
            type="text" 
            placeholder="e.g. My Greenwood Villa" 
            value={propName} 
            onChange={e => setPropName(e.target.value)} 
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Property Type & Capacity Range</label>
          <select value={propType} onChange={e => setPropType(e.target.value)}>
            <option value="Residential (1,000 to 5,000 Liters)">Residential (1,000 to 5,000 Liters)</option>
            <option value="Commercial (10K to 50K Liters)">Commercial (10K to 50K Liters)</option>
            <option value="Industrial (50K to 100K Liters)">Industrial (50K to 100K Liters)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Street Address / Area</label>
          <textarea 
            placeholder="Plot/Flat No, Apartment, Street, Locality" 
            value={propAddress} 
            onChange={e => setPropAddress(e.target.value)} 
            rows={2}
          />
        </div>

        <div className="grid-responsive-3">
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>City</label>
            <input 
              type="text" 
              placeholder="City" 
              value={propCity} 
              onChange={e => setPropCity(e.target.value)} 
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>District</label>
            <input 
              type="text" 
              placeholder="District" 
              value={propDistrict} 
              onChange={e => setPropDistrict(e.target.value)} 
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>State</label>
            <input 
              type="text" 
              placeholder="State" 
              value={propState} 
              onChange={e => setPropState(e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Google Maps Location URL Link</label>
          <input 
            type="text" 
            placeholder="Paste Google Maps link (Google Maps API/URL)" 
            value={propMapsUrl} 
            onChange={e => setPropMapsUrl(e.target.value)} 
          />
        </div>

        <div style={{
          padding: '16px', border: '1px solid var(--border)', borderRadius: '12px',
          backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Simulated Map Location</span>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onLocate}
            style={{ padding: '8px 12px', fontSize: '12px', alignSelf: 'flex-start' }}
          >
            <MapPin size={14} /> Locate via GPS
          </button>
          {propMapsUrl && (
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>
              ✓ GPS coordinates and Map URL locked!
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isLoading}>
            {editingPropId ? 'Update Property' : 'Save Property'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function BookServiceView({
  properties, bookPropertyId, setBookPropertyId, bookType, setBookType,
  bookDate, setBookDate, bookUrgent, setBookUrgent, onBook, onCancel, isLoading
}) {
  const selectedProp = properties.find(p => p._id === bookPropertyId);

  return (
    <div className="card animate-fade-in">
      <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Book Inspection Visit</h2>

      <form onSubmit={onBook} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Select Property</label>
          <select value={bookPropertyId} onChange={e => {
            const val = e.target.value;
            setBookPropertyId(val);
            const found = properties.find(p => p._id === val);
            if (found) {
              setBookType(found.type);
            }
          }}>
            {properties.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Booking Type & Capacity Range</label>
          <div style={{
            padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '12px',
            backgroundColor: '#f1f5f9', fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px'
          }}>
            {selectedProp?.type || 'Not Specified'}
          </div>
        </div>

        {selectedProp && (
          <div style={{
            padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '12px',
            backgroundColor: '#f9f9f9', fontSize: '12px', color: 'var(--text-primary)'
          }}>
            <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>Auto-filled Location Details</div>
            <div>{selectedProp.address}, {selectedProp.city}, {selectedProp.district}, {selectedProp.state}</div>
            {selectedProp.googleMapsUrl && (
              <div style={{ marginTop: '6px' }}>
                <a 
                  href={selectedProp.googleMapsUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <MapPin size={12} /> Open Maps Location
                </a>
              </div>
            )}
          </div>
        )}

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Preferred Visit Date</label>
          {/* Native HTML Date Selector Calendar Picker */}
          <input 
            type="date" 
            value={bookDate} 
            onChange={e => setBookDate(e.target.value)} 
          />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '12px'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Urgent Assessment Request</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Check this if you require immediate visit within 24h</div>
          </div>
          <input 
            type="checkbox" 
            checked={bookUrgent} 
            onChange={e => setBookUrgent(e.target.checked)} 
            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
          />
        </div>

        <div style={{
          padding: '12px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-accent)',
          borderRadius: '12px', fontSize: '11px', color: 'var(--text-secondary)'
        }}>
          🌱 <strong>Rajesh Patel</strong> has been automatically allocated as your visiting engineer.
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isLoading}>
            Confirm Booking
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function BookingStatusView({
  bookingId, bookings, properties, quote, record,
  onAccept, onDecline, onBack, isLoading
}) {
  const booking = bookings.find(b => b._id === bookingId);
  if (!booking) return null;
  const property = properties.find(p => p._id === booking.propertyId);

  // Stepper timeline calculation
  const statuses = ['REQUESTED', 'ASSESSMENT', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
  const currentIndex = statuses.indexOf(booking.status);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-secondary" onClick={onBack} style={{ padding: '10px 18px', fontSize: '13px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Request ID: <strong style={{ color: 'var(--text-primary)' }}>#{booking._id.slice(-6).toUpperCase()}</strong>
        </span>
      </div>

      {/* Modern Stepper Graphical Tracker */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)' }}>Service Progress Tracker</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '12px 0', overflowX: 'auto', gap: '10px' }}>
          {/* Stepper bar line */}
          <div style={{
            position: 'absolute', top: '24px', left: '35px', right: '35px', height: '4px',
            backgroundColor: '#e2e8f0', zIndex: 1
          }}>
            <div style={{
              width: `${(currentIndex / (statuses.length - 1)) * 100}%`, height: '100%',
              background: 'var(--gradient-accent)',
              boxShadow: '0 0 8px var(--primary-accent)'
            }}></div>
          </div>

          {/* Steps circles */}
          {statuses.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isActive = idx <= currentIndex;
            return (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, minWidth: '85px', textAlign: 'center' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isCurrent ? '#ffffff' : (isCompleted ? 'var(--primary)' : '#e2e8f0'),
                  border: isCurrent ? '3px solid var(--primary-accent)' : 'none',
                  color: isCurrent ? 'var(--primary-accent)' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none'
                }} className={isCurrent ? 'glow-active' : ''}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: isActive ? '700' : '500',
                  marginTop: '8px',
                  color: isCurrent ? 'var(--primary)' : (isCompleted ? 'var(--text-primary)' : 'var(--text-light)'),
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap'
                }}>{step.replace('_', ' ').toLowerCase()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Details Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '24px'
      }}>
        
        {/* Left Column: Inspection specifications display */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            Audit Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Property:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{property?.name || 'Property'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Address:</span>
              <span style={{ textAlign: 'right', maxWidth: '240px', fontSize: '13px' }}>
                {property ? `${property.address}, ${property.city}, ${property.district}, ${property.state}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Engineer:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{booking.assignedEngineer || 'Pending Assignment'}</strong>
            </div>
            {booking.operatorPhone && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Contact Operator:</span>
                <strong style={{ color: 'var(--primary)' }}>
                  📞 <a href={`tel:${booking.operatorPhone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{booking.operatorPhone}</a>
                </strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Scheduled Visit:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{booking.siteVisitDate}</strong>
            </div>
            {booking.treatmentDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Treatment Date:</span>
                <strong style={{ color: 'var(--primary-dark)' }}>{booking.treatmentDate}</strong>
              </div>
            )}
            
            {booking.actualCapacityLiters && (
              <div style={{
                padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-light)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ fontWeight: '800', color: 'var(--primary-dark)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📏 Engineer Site Audit Metrics
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Inspected Septic Capacity:</span>
                  <strong>{booking.actualCapacityLiters.toLocaleString()} Liters</strong>
                </div>

                {booking.actualVolumeLiters !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>Estimated Sludge Volume:</span>
                    <strong style={{ color: 'var(--danger)' }}>{booking.actualVolumeLiters.toLocaleString()} Liters</strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Total Number of Septic Tanks:</span>
                  <strong>{booking.numberOfTanks}</strong>
                </div>
                
                {booking.tanks && booking.tanks.length > 0 && (
                  <div style={{
                    backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px',
                    border: '1px solid rgba(4, 120, 87, 0.1)', fontSize: '12px', marginTop: '4px',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                  }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Tank-wise Audit Specs ({booking.unit}):</span>
                    {booking.tanks.map((t, idx) => (
                      <div key={idx} style={{ padding: '6px 0', borderBottom: idx < booking.tanks.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                        <span>Tank {idx + 1} ({t.length}x{t.width}x{t.height}):</span>
                        <strong style={{ color: 'var(--primary)' }}>Cap: {t.calculatedCapacityLiters}L / Waste: {t.calculatedVolumeLiters}L</strong>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid rgba(4, 120, 87, 0.1)', paddingTop: '8px' }}>
                  <span>Piping Hose Required:</span>
                  <strong>{booking.pipeLengthRequiredMeters} meters</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Electricity Available:</span>
                  <strong>{booking.electricityConnection ? 'Yes (Utility Line)' : 'No (Requires Generator)'}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quote or Certificate Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quote Review Area */}
          {quote && (
            <div className="card animate-fade-in" style={{
              border: quote.status === 'SENT' ? '2px solid var(--primary-accent)' : '1px solid var(--border)',
              boxShadow: quote.status === 'SENT' ? 'var(--shadow-brand)' : 'var(--shadow)',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>
                  Service Cost Quotation
                </h3>
                <span style={{
                  fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px',
                  backgroundColor: quote.status === 'SENT' ? 'var(--warning-light)' : 'var(--primary-light)',
                  color: quote.status === 'SENT' ? 'var(--warning)' : 'var(--primary)'
                }}>{quote.status}</span>
              </div>
              
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong>Scope of work:</strong> {quote.serviceDetails}
              </p>
              
              {/* Receipt Breakup Box */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '14px'
              }}>
                {quote.dayRates && quote.dayRates.length > 0 ? (
                  quote.dayRates.map(dr => (
                    <div key={dr.dayNumber} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Day {dr.dayNumber} Recovery Rate:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹{parseFloat(dr.amount).toLocaleString('en-IN')}.00</strong>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Base De-sludging:</span>
                      <strong>₹{quote.quotedAmount.toLocaleString('en-IN')}.00</strong>
                    </div>
                    {quote.additionalCharges > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Recycling Operations:</span>
                        <strong>₹{quote.additionalCharges.toLocaleString('en-IN')}.00</strong>
                      </div>
                    )}
                  </>
                )}
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: '800',
                  borderTop: '2px dashed var(--border)',
                  paddingTop: '10px',
                  fontSize: '16px',
                  color: 'var(--primary-dark)'
                }}>
                  <span>Total Bid Amount:</span>
                  <span>₹{quote.totalAmount.toLocaleString('en-IN')}.00</span>
                </div>
              </div>

              {quote.status === 'SENT' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-primary" onClick={() => onAccept(quote._id)} style={{ flex: 1 }} disabled={isLoading}>
                      Approve & Confirm Contract
                    </button>
                    <button className="btn-danger" onClick={() => onDecline(quote._id)} disabled={isLoading}>
                      Decline
                    </button>
                  </div>
                  <a 
                    href={`${API_BASE}/quote/pdf/${bookingId}`}
                    download
                    className="btn-secondary"
                    style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
                  >
                    <Download size={14} /> Download Quote PDF
                  </a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{
                    padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textAlign: 'center',
                    backgroundColor: quote.status === 'ACCEPTED' ? 'var(--primary-light)' : 'var(--danger-light)',
                    color: quote.status === 'ACCEPTED' ? 'var(--primary)' : 'var(--danger)',
                    border: '1px solid currentColor'
                  }}>
                    Contract Status: {quote.status === 'ACCEPTED' ? 'Approved by Customer (Awaiting Treatment Schedule)' : 'Declined'}
                  </div>
                  {quote.status === 'ACCEPTED' && (
                    <a 
                      href={`${API_BASE}/quote/pdf/${bookingId}`}
                      download
                      className="btn-secondary"
                      style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <Download size={14} /> View Approved Quote PDF
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completion Service Letter & Invoice View */}
          {record && (
            <div className="card animate-fade-in" style={{
              border: '1px solid var(--border)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)'
            }}>
              {/* Badge header */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '36px' }}>📄</span>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary-dark)', letterSpacing: '0.5px' }}>
                  SERVICE COMPLETION LETTER
                </h3>
                <span style={{
                  fontSize: '9px', fontWeight: '800', letterSpacing: '1.5px', color: 'var(--primary)',
                  backgroundColor: 'var(--primary-light)', padding: '4px 10px', borderRadius: '4px'
                }}>
                  RECOVERY OPERATIONS COMPLETED
                </span>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', maxWidth: '320px' }}>
                This record verifies that organic sludge recovery, thermal pasteurization, and zero-waste recycling operations have been finalized.
              </p>

              {/* Outcomes list */}
              <div style={{
                width: '100%', padding: '16px', backgroundColor: '#f8fafc',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Waste Processed:</span>
                  <strong>{record.wasteProcessedLiters.toLocaleString()} Liters</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Liquid Recovered (Water):</span>
                  <strong>{record.waterRecoveredLiters.toLocaleString()} Liters</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Solid Recovered (Biochar):</span>
                  <strong>{record.biocharProducedKg.toLocaleString()} kg</strong>
                </div>
              </div>

              {/* Verified Badge */}
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                border: '3px dashed var(--primary-accent)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', fontSize: '9px', fontWeight: '900',
                color: 'var(--primary)', backgroundColor: 'var(--primary-light)',
                transform: 'rotate(-5deg)', margin: '4px 0'
              }}>
                <div>VERIFIED</div>
                <div style={{ fontSize: '8px', color: 'var(--text-secondary)', marginTop: '2px' }}>COMPLETED</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <a 
                  href={`${API_BASE}/certificate/pdf/${bookingId}`}
                  download
                  className="btn-primary"
                  style={{ width: '100%', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Download size={16} /> Download Completion Letter
                </a>

                <a 
                  href={`${API_BASE}/invoice/pdf/${bookingId}`}
                  download
                  className="btn-secondary"
                  style={{ width: '100%', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <FileText size={16} /> Download Invoice PDF
                </a>
              </div>
            </div>
          )}
          
        </div>
        
      </div>
    </div>
  );
}

function OperatorDashboardView({
  user, bookings, properties, operatorTab, setOperatorTab,
  inspectBooking, setInspectBooking, completeBooking, setCompleteBooking,
  
  // Inspection form
  auditCapacity, setAuditCapacity,
  auditTanks, setAuditTanks,
  auditDimensions, setAuditDimensions,
  auditPipe, setAuditPipe,
  auditElectricity, setAuditElectricity,
  onSubmitAudit,

  // Complete form
  recoveryWaste, setRecoveryWaste,
  recoverySolid, setRecoverySolid,
  recoveryLiquid, setRecoveryLiquid,
  onSubmitComplete,

  onStartService,
  onAcceptBookingRequest,
  onScheduleBooking,
  isLoading
}) {
  const [unit, setUnit] = useState('ft');
  const [tanksList, setTanksList] = useState([{ length: '', width: '', height: '', filledHeight: '' }]);
  const [pipeLength, setPipeLength] = useState('');
  const [electricity, setElectricity] = useState(true);
  const [dayRatesList, setDayRatesList] = useState([{ dayNumber: 1, amount: '' }]);
  const [schedulingBooking, setSchedulingBooking] = useState(null);
  const [schedDate, setSchedDate] = useState('');

  useEffect(() => {
    if (inspectBooking) {
      setUnit('ft');
      setTanksList([{ length: '', width: '', height: '', filledHeight: '' }]);
      setPipeLength('');
      setElectricity(true);
      setDayRatesList([{ dayNumber: 1, amount: '' }]);
    }
  }, [inspectBooking]);

  const ongoing = bookings.filter(b => b.status === 'ASSESSMENT' || b.status === 'REQUESTED');
  const activeTreatments = bookings.filter(b => b.status === 'QUOTE_ACCEPTED' || b.status === 'IN_PROGRESS' || b.status === 'QUOTE_SENT' || b.status === 'SCHEDULED');
  const past = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  const filteredList = whenTab(operatorTab, ongoing, activeTreatments, past);

  function whenTab(tab, ongoing, active, past) {
    if (tab === 0) return ongoing;
    if (tab === 1) return active;
    return past;
  }

  // Get accent border and badge styles based on booking status
  const getStatusStyle = (status) => {
    switch (status) {
      case 'REQUESTED':
        return { borderLeft: '5px solid #d97706', badgeBg: '#fef3c7', badgeColor: '#b45309', label: 'Requested' };
      case 'ASSESSMENT':
        return { borderLeft: '5px solid #0d9488', badgeBg: '#ccfbf1', badgeColor: '#0f766e', label: 'Inspection Audit' };
      case 'QUOTE_SENT':
        return { borderLeft: '5px solid #ca8a04', badgeBg: '#fef9c3', badgeColor: '#854d0e', label: 'Quote Dispatched' };
      case 'QUOTE_ACCEPTED':
        return { borderLeft: '5px solid #16a34a', badgeBg: '#dcfce7', badgeColor: '#166534', label: 'Quote Approved' };
      case 'SCHEDULED':
        return { borderLeft: '5px solid #15803d', badgeBg: '#dcfce7', badgeColor: '#166534', label: 'Scheduled' };
      case 'IN_PROGRESS':
        return { borderLeft: '5px solid #047857', badgeBg: '#d1fae5', badgeColor: '#065f46', label: 'De-Sludging Active' };
      case 'COMPLETED':
        return { borderLeft: '5px solid #059669', badgeBg: '#d1fae5', badgeColor: '#065f46', label: 'Completed' };
      default:
        return { borderLeft: '5px solid #94a3b8', badgeBg: '#f1f5f9', badgeColor: '#475569', label: status };
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Premium Operations Greet Header Banner */}
      <div style={{
        background: 'var(--gradient-brand)',
        padding: '32px 36px',
        borderRadius: 'var(--radius-lg)',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-brand)',
        flexWrap: 'wrap',
        gap: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative SVG backgrounds */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '20%', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        
        <div style={{ zIndex: 1 }}>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a7f3d0' }}>ECOZZA OFFICIAL CONTROL BOARD</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>Hello, {user?.name || 'Rajesh Patel'} 👋</h2>
          <p style={{ fontSize: '14px', color: '#d1fae5', marginTop: '6px', fontWeight: '500', maxWidth: '500px' }}>
            Operations Auditor ID: {user?.employeeId || '1234'} | Performing volume audits, pasteurization checks, and zero-waste logs.
          </p>
        </div>
      </div>

      {/* Stats Summary Counter widgets */}
      <div className="grid-responsive-3">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#ffffff', padding: '20px', border: '1px solid var(--border)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📋</div>
          <div>
            <h4 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)' }}>{ongoing.length}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', marginTop: '2px' }}>Pending Audits</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#ffffff', padding: '20px', border: '1px solid var(--border)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⚡</div>
          <div>
            <h4 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)' }}>{activeTreatments.length}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', marginTop: '2px' }}>Active Treatments</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#ffffff', padding: '20px', border: '1px solid var(--border)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📜</div>
          <div>
            <h4 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)' }}>{past.length}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', marginTop: '2px' }}>Completed Jobs</p>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          display: 'inline-flex',
          backgroundColor: '#e2e8f0',
          padding: '4px',
          borderRadius: '12px',
          width: 'fit-content'
        }}>
          {['Inspections List', 'Active Treatments', 'Service History'].map((tabLabel, idx) => (
            <button 
              key={tabLabel}
              onClick={() => setOperatorTab(idx)}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: operatorTab === idx ? '#ffffff' : 'transparent',
                boxShadow: operatorTab === idx ? 'var(--shadow-sm)' : 'none',
                color: operatorTab === idx ? 'var(--primary-dark)' : 'var(--text-secondary)'
              }}
            >
              {tabLabel}
            </button>
          ))}
        </div>

        {/* Operator Tasks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredList.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 16px', border: '2px dashed var(--border)',
              borderRadius: '20px', color: 'var(--text-light)', fontSize: '14px', backgroundColor: '#ffffff'
            }}>
              No active tasks found in this section.
            </div>
          ) : (
            filteredList.map(b => {
              const prop = properties.find(p => p._id === b.propertyId);
              const statusStyle = getStatusStyle(b.status);

              return (
                <div 
                  key={b._id} 
                  className="card animate-fade-in" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    backgroundColor: '#ffffff',
                    borderLeft: statusStyle.borderLeft,
                    boxShadow: 'var(--shadow-sm)',
                    padding: '24px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-primary)' }}>{prop?.name || 'Inspected Property'}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>
                        {prop?.type || 'Residential'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '12px', 
                      fontWeight: '800', 
                      padding: '6px 12px',
                      backgroundColor: statusStyle.badgeBg, 
                      color: statusStyle.badgeColor, 
                      borderRadius: '8px'
                    }}>
                      {statusStyle.label}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: '12px',
                    fontSize: '13px', 
                    color: 'var(--text-secondary)',
                    backgroundColor: '#f8fafc',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)' }} />
                      <span>{prop ? `${prop.address}, ${prop.city}, ${prop.district}` : 'Unknown Address'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} style={{ color: 'var(--primary)' }} />
                      <span>Visit Date: <strong>{b.siteVisitDate}</strong></span>
                    </div>

                    {b.treatmentDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} style={{ color: 'var(--primary-accent)' }} />
                        <span>Treatment Date: <strong style={{ color: 'var(--primary-dark)' }}>{b.treatmentDate}</strong></span>
                      </div>
                    )}

                    {b.actualCapacityLiters > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ color: 'var(--primary)' }} />
                        <span>Inspected Capacity: <strong>{b.actualCapacityLiters.toLocaleString()} Liters</strong></span>
                      </div>
                    )}
                  </div>

                  {prop?.googleMapsUrl && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a 
                        href={prop.googleMapsUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <MapPin size={12} /> Map Coordinates (Audit Locked)
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {b.status === 'REQUESTED' && (
                      <button 
                        className="btn-primary" 
                        onClick={() => onAcceptBookingRequest(b._id)} 
                        style={{ fontSize: '13px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Check size={14} /> Accept Site Visit Request
                      </button>
                    )}

                    {b.status === 'ASSESSMENT' && (
                      <button 
                        className="btn-primary" 
                        onClick={() => setInspectBooking(b)} 
                        style={{ fontSize: '13px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Edit size={14} /> Record Site Inspection & Quote
                      </button>
                    )}

                    {b.status === 'QUOTE_SENT' && (
                      <div style={{
                        padding: '10px 16px', backgroundColor: '#fef9c3', color: '#854d0e',
                        fontSize: '13px', borderRadius: '8px', fontWeight: '700', width: '100%', border: '1px solid #fef08a'
                      }}>
                        ⏳ Quoted day-wise breakdown sent. Waiting for customer approval...
                      </div>
                    )}

                    {b.status === 'QUOTE_ACCEPTED' && (
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          setSchedDate(b.siteVisitDate);
                          setSchedulingBooking(b);
                        }} 
                        style={{ fontSize: '13px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-accent)' }}
                      >
                        <Calendar size={14} /> Schedule Treatment Service
                      </button>
                    )}

                    {b.status === 'SCHEDULED' && (
                      <button 
                        className="btn-primary" 
                        onClick={() => onStartService(b._id)} 
                        style={{ fontSize: '13px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Play size={14} /> Start de-sludging on-site
                      </button>
                    )}

                    {b.status === 'IN_PROGRESS' && (
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          const cap = b.actualCapacityLiters || 3000;
                          setRecoveryWaste(cap.toString());
                          setRecoverySolid((cap * 0.05).toFixed(0));
                          setRecoveryLiquid((cap * 0.95).toFixed(0));
                          setCompleteBooking(b);
                        }} 
                        style={{ fontSize: '13px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-accent)', color: '#ffffff' }}
                      >
                        <Check size={14} /> Complete Work & Log Recovery outcomes
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Dialogue for Audit Parameters */}
      {inspectBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 200
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '540px', backgroundColor: '#ffffff', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: '28px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '18px', color: 'var(--primary-dark)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              Submit Site Inspection & Quoting
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Unit Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Measurement Unit</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <option value="ft">Feet (ft) - multiplier 28.3168L</option>
                  <option value="m">Meters (m) - multiplier 1000L</option>
                </select>
              </div>

              {/* Dynamic Tanks List */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '8px', color: 'var(--primary)' }}>
                  Septic Tanks Specifications
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {tanksList.map((tank, idx) => {
                    const l = parseFloat(tank.length) || 0;
                    const w = parseFloat(tank.width) || 0;
                    const h = parseFloat(tank.height) || 0;
                    const fh = parseFloat(tank.filledHeight) || 0;
                    const mult = unit === 'm' ? 1000 : 28.3168;
                    const cap = Math.round(l * w * h * mult);
                    const vol = Math.round(l * w * fh * mult);

                    return (
                      <div key={idx} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: '#f8fafc', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>Septic Tank #{idx + 1}</span>
                          {tanksList.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => setTanksList(tanksList.filter((_, i) => i !== idx))}
                              style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Length ({unit})</label>
                            <input 
                              type="number" 
                              placeholder="0.0"
                              value={tank.length} 
                              onChange={e => {
                                const newTanks = [...tanksList];
                                newTanks[idx].length = e.target.value;
                                setTanksList(newTanks);
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Width ({unit})</label>
                            <input 
                              type="number" 
                              placeholder="0.0"
                              value={tank.width} 
                              onChange={e => {
                                const newTanks = [...tanksList];
                                newTanks[idx].width = e.target.value;
                                setTanksList(newTanks);
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Height ({unit})</label>
                            <input 
                              type="number" 
                              placeholder="0.0"
                              value={tank.height} 
                              onChange={e => {
                                const newTanks = [...tanksList];
                                newTanks[idx].height = e.target.value;
                                setTanksList(newTanks);
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Filled Sludge ({unit})</label>
                            <input 
                              type="number" 
                              placeholder="0.0"
                              value={tank.filledHeight} 
                              onChange={e => {
                                const newTanks = [...tanksList];
                                newTanks[idx].filledHeight = e.target.value;
                                setTanksList(newTanks);
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '800', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                          <span>Capacity: {cap.toLocaleString()} L</span>
                          <span>Sludge: {vol.toLocaleString()} L</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setTanksList([...tanksList, { length: '', width: '', height: '', filledHeight: '' }])}
                  style={{ width: '100%', marginTop: '10px', padding: '8px', fontSize: '12px', fontWeight: '700' }}
                >
                  + Add Another Tank
                </button>
              </div>

              {/* Live Totals Card */}
              {(() => {
                const mult = unit === 'm' ? 1000 : 28.3168;
                let totalCap = 0;
                let totalVol = 0;
                tanksList.forEach(t => {
                  const l = parseFloat(t.length) || 0;
                  const w = parseFloat(t.width) || 0;
                  const h = parseFloat(t.height) || 0;
                  const fh = parseFloat(t.filledHeight) || 0;
                  totalCap += l * w * h * mult;
                  totalVol += l * w * fh * mult;
                });
                return (
                  <div style={{ padding: '14px 18px', backgroundColor: 'var(--primary-light)', borderRadius: '12px', border: '1px solid var(--primary-accent)', fontSize: '13px' }}>
                    <div style={{ fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '6px', fontSize: '14px' }}>Live Auto-Calculated Totals</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span>Total Capacity: <strong>{Math.round(totalCap).toLocaleString()} Liters</strong></span>
                      <span>Total Sludge: <strong>{Math.round(totalVol).toLocaleString()} Liters</strong></span>
                    </div>
                  </div>
                );
              })()}

              {/* Hose pipe and electricity connection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Hose Piping Length Required (meters)</label>
                  <input type="number" value={pipeLength} onChange={e => setPipeLength(e.target.value)} placeholder="e.g. 25" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Electricity Connection Available?</span>
                  <input type="checkbox" checked={electricity} onChange={e => setElectricity(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                </div>
              </div>

              {/* Day-Wise Quote Rates Builder */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '8px', color: 'var(--primary)' }}>
                  Day-Wise Service Rate Builder
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dayRatesList.map((dr, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', minWidth: '60px', fontWeight: '700' }}>Day {dr.dayNumber}:</span>
                      <input 
                        type="number" 
                        placeholder="Rate Amount (₹)" 
                        value={dr.amount}
                        onChange={e => {
                          const newRates = [...dayRatesList];
                          newRates[idx].amount = e.target.value;
                          setDayRatesList(newRates);
                        }}
                        style={{ flex: 1 }}
                      />
                      {dayRatesList.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const filtered = dayRatesList.filter((_, i) => i !== idx);
                            const reindexed = filtered.map((item, i) => ({ ...item, dayNumber: i + 1 }));
                            setDayRatesList(reindexed);
                          }}
                          style={{ padding: '8px 12px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setDayRatesList([...dayRatesList, { dayNumber: dayRatesList.length + 1, amount: '' }])}
                  style={{ width: '100%', marginTop: '10px', padding: '8px', fontSize: '12px', fontWeight: '700' }}
                >
                  + Add Service Day
                </button>
              </div>

              {/* Quote Total Cost */}
              {(() => {
                const total = dayRatesList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '900', fontSize: '16px', borderTop: '2px solid var(--border)', paddingTop: '14px' }}>
                    <span>Total Quoted Estimate:</span>
                    <span style={{ color: 'var(--primary-dark)', fontSize: '20px' }}>₹{total.toLocaleString('en-IN')}.00</span>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    if (tanksList.some(t => !t.length || !t.width || !t.height || !t.filledHeight)) {
                      alert("Please fill dimensions and filled height for all tanks.");
                      return;
                    }
                    if (!pipeLength) {
                      alert("Please enter hose piping length.");
                      return;
                    }
                    if (dayRatesList.some(dr => !dr.amount)) {
                      alert("Please fill cost amount for all days.");
                      return;
                    }
                    onSubmitAudit({
                      unit,
                      tanks: tanksList.map(t => ({
                        length: parseFloat(t.length),
                        width: parseFloat(t.width),
                        height: parseFloat(t.height),
                        filledHeight: parseFloat(t.filledHeight)
                      })),
                      pipeLength: parseFloat(pipeLength),
                      electricity,
                      dayRates: dayRatesList.map(dr => ({
                        dayNumber: dr.dayNumber,
                        amount: parseFloat(dr.amount)
                      }))
                    });
                  }} 
                  disabled={isLoading}
                >
                  Confirm & Dispatch Quote
                </button>
                <button className="btn-secondary" onClick={() => setInspectBooking(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialogue for Scheduling Treatment Date */}
      {schedulingBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 200
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#ffffff', padding: '28px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '18px', color: 'var(--primary-dark)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              Schedule Treatment Service
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Treatment Execution Date</label>
                <input 
                  type="date" 
                  value={schedDate} 
                  onChange={e => setSchedDate(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Specify the date when the mobile treatment unit and operator team will arrive at the site.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={async () => {
                    if (!schedDate) {
                      alert('Please select a valid date.');
                      return;
                    }
                    await onScheduleBooking(schedulingBooking._id, schedDate);
                    setSchedulingBooking(null);
                  }}
                  disabled={isLoading}
                >
                  Confirm Schedule
                </button>
                <button className="btn-secondary" onClick={() => setSchedulingBooking(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialogue for Recovery Outcomes Completion */}
      {completeBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 200
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', padding: '28px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '18px', color: 'var(--primary-dark)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              Zero-Waste Recovery Metrics
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Waste Drained & Processed (Liters)</label>
                <input 
                  type="number" 
                  value={recoveryWaste} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setRecoveryWaste(e.target.value);
                    setRecoverySolid((val * 0.05).toFixed(0));
                    setRecoveryLiquid((val * 0.95).toFixed(0));
                  }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Solid Waste Recovered (Biochar in kg)</label>
                <input type="number" value={recoverySolid} onChange={e => setRecoverySolid(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Liquid Recovered (For Land App in Liters)</label>
                <input type="number" value={recoveryLiquid} onChange={e => setRecoveryLiquid(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={onSubmitComplete} disabled={isLoading}>
                  Complete Service & Issue Completion Letter
                </button>
                <button className="btn-secondary" onClick={() => setCompleteBooking(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
