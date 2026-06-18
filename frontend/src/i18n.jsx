import React, { createContext, useContext, useMemo, useState } from 'react';

const translations = {
  en: {
    emailDatabase: 'Email database',
    adminAccess: 'Administrator access',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    signInError: 'Could not sign in',
    loginHelp: 'Authentication is required before contacts or email tools can be accessed.',
    sendHistory: 'Send history',
    deliveryStatus: 'Delivery status',
    systemSettings: 'System settings',
    companyTools: 'COMPANY TOOLS',
    administrator: 'Administrator',
    companyAccess: 'Company access',
    searchDatabase: 'Search company email database...',
    databaseEyebrow: 'COMPANY DATABASE',
    databaseTitle: 'Email database',
    databaseSubtitle: 'Select any group of recipients and send one email to everyone with a single click.',
    importCsv: 'Import CSV',
    csvTooLarge: 'CSV file must be 5 MB or smaller',
    contactsLoadError: 'Contacts could not be loaded from the database',
    contactAddError: 'Could not add this email',
    contactDeleteConfirm: 'Delete this contact?',
    contactDeleted: 'Contact deleted',
    contactDeleteError: 'Could not delete this contact',
    contactEditTitle: 'Edit name',
    contactNameLabel: 'Name',
    contactUpdated: 'Name updated',
    contactUpdateError: 'Name could not be updated',
    deleteAll: 'Delete all',
    deleteAllContactsConfirm: 'Permanently delete all {count} contacts from the email database?',
    contactsDeleted: '{count} contacts were permanently deleted.',
    contactsDeleteError: 'Contacts could not be deleted',
    csvImportFailed: 'CSV import failed',
    addEmail: 'Add email',
    companyRecipients: 'Company recipients',
    addressesAvailable: '{count} email addresses available',
    searchRecipient: 'Search name, email or company',
    recipient: 'Recipient',
    company: 'Company',
    status: 'Status',
    importTitle: 'Import the company email database',
    importHelp: 'Upload a CSV or add addresses manually. Then select recipients and send immediately.',
    selectedRecipients: '{count} recipients selected',
    readyDelivery: 'Ready for immediate delivery',
    clearSelection: 'Clear selection',
    writeSend: 'Write and send email',
    sendNow: 'Send email now',
    sendToCount: 'Send now to {count}',
    sendHelp: 'This message will be sent to {count} selected recipients.',
    to: 'TO',
    more: '+{count} more',
    subject: 'Subject',
    message: 'Message',
    messagePlaceholder: 'Write your message here...',
    individualNotice: 'One click will queue this email for all selected recipients. Each person receives an individual email.',
    cancel: 'Cancel',
    sending: 'Sending...',
    addDatabaseTitle: 'Add email to database',
    fullName: 'Full name',
    emailAddress: 'Email address',
    tags: 'Tags',
    tagsPlaceholder: 'client, partner, team',
    addDatabase: 'Add email',
    emailAdded: 'Email added to the database',
    imported: 'Imported {imported} of {total} email addresses',
    queued: 'Email sent successfully to {count} recipients',
    historyTitle: 'Send history',
    historySubtitle: 'Review messages sent from the company email database.',
    sendEmailNow: 'Send email now',
    last30: 'Last 30 days',
    last7: 'Last 7 days',
    last3Weeks: 'Last 3 weeks',
    last90: 'Last 90 days',
    lastYear: 'Last year',
    allTime: 'All time',
    recentSends: 'Recent sends',
    historyEyebrow: 'INTERNAL OPERATIONS',
    historyLoadError: 'History could not be loaded from the database',
    campaignDraftCreated: 'Campaign created and saved as draft',
    contactsLoadSimpleError: 'Could not load contacts',
    selectOneContact: 'Select at least one contact',
    campaignQueued: '{count} emails added to the delivery queue',
    campaignDeleteConfirmNamed: 'Delete "{name}"?',
    moreEmailsSent: '+{count} more emails sent',
    statusDraft: 'Draft',
    statusPending: 'Pending',
    statusQueued: 'Queued',
    statusSending: 'Sending',
    statusCompleted: 'Completed',
    statusCompletedWithErrors: 'Completed with errors',
    statusSent: 'Sent successfully',
    statusFailed: 'Failed',
    statusActive: 'Active',
    campaignsLabel: 'Campaigns',
    selectedPeriod: 'Selected period',
    successfulDeliveries: 'Successful deliveries',
    sentWithoutErrors: 'Sent without errors',
    needsReview: 'Needs review',
    campaignsCount: '{count} campaigns',
    staffMessages: 'Messages sent by company staff.',
    noEmails: 'No company emails sent yet',
    selectRecipients: 'Select recipients',
    systemStatus: 'System status',
    operational: 'System operational',
    openDatabase: 'Open email database',
    deliveryTitle: 'Delivery status',
    deliverySubtitle: 'Follow every delivery job and resolve failures quickly.',
    refresh: 'Refresh',
    waiting: 'Waiting',
    sendingNow: 'Sending now',
    delivered: 'Delivered',
    failed: 'Failed',
    deliveryProgress: 'Delivery progress',
    clearFailed: 'Clear failed',
    retryFailed: 'Retry failed',
    deliveryEyebrow: 'DELIVERY',
    failedCleared: 'Failed jobs cleared',
    failedRetried: 'Failed jobs retried',
    noFailedJobs: 'No failed jobs found',
    queueActionFailed: 'Queue action failed',
    deliveryActivityHelp: 'Persistent delivery activity from the database',
    emailJobsLabel: 'Email jobs',
    deliveryServiceName: 'Internal delivery service',
    deliveryServiceAvailable: 'Email delivery service is available.',
    serviceAvailability: 'Service availability',
    queueReady: 'The queue is ready',
    queueReadyHelp: 'Email jobs will appear here after you send a message.',
    settingsTitle: 'System settings',
    settingsSubtitle: 'Configure the company sender and email delivery provider.',
    saveSettings: 'Save settings',
    senderIdentity: 'Sender identity',
    senderHelp: 'What clients see in their inbox.',
    senderName: 'Sender name',
    senderEmail: 'Sender email',
    emailProvider: 'Email provider',
    providerHelp: 'Choose how company emails are delivered.',
    deliveryMethod: 'Delivery method',
    previewMode: 'Preview mode (no real emails)',
    smtpServer: 'Company SMTP server',
    sendgrid: 'SendGrid',
    smtpHost: 'SMTP host',
    port: 'Port',
    username: 'Username',
    password: 'Password',
    secureTls: 'Use secure TLS connection',
    apiKey: 'SendGrid API key',
    testConnection: 'Test connection',
    previewInfo: 'Safe testing mode is active. Messages are processed but not delivered externally.',
    storedLocally: 'Configuration is stored locally',
    storedHelp: 'Changes apply immediately to future email sends.',
    simpleSettingsHelp: 'Connect the company email and send a quick test message.',
    emailConnection: 'Email connection',
    emailConnectionHelp: 'Choose Gmail or Outlook. Technical settings are automatic.',
    companyEmail: 'Company email',
    appPassword: 'App password',
    appPasswordHelp: 'Use an app password generated by Gmail or Microsoft, not your normal password.',
    testEmailTitle: 'Send a test email',
    testEmailHelp: 'Enter your own address to verify how delivery works.',
    testRecipient: 'Test recipient email',
    sendTestEmail: 'Send test email',
    settingsSaved: 'Settings saved',
    settingsLoadError: 'Could not load settings',
    settingsSaveError: 'Could not save settings',
    previewTestDone: 'Test processed in preview mode. No real email was delivered.',
    testEmailSent: 'Test email sent successfully',
    testEmailFailed: 'Test email could not be sent'
    ,sendSuccessTitle: 'Emails sent successfully'
    ,sendSuccessQueued: 'Emails queued for delivery'
    ,sendSuccessHelp: 'Emails will be delivered within the next few minutes. Check the Delivery Status page to monitor progress.'
    ,done: 'Done'
    ,close: 'Close'
    ,campaignCode: 'Campaign ID'
    ,attachedFileSingular: 'file'
    ,attachedFilePlural: 'files'
    ,noName: 'No name'
    ,sendToSelected: 'Send to {count}'
    ,composeTitle: 'Compose email'
    ,composeSubtitle: 'Choose clients, write the message and attach photos or documents.'
    ,chooseRecipients: 'Choose clients'
    ,writeMessage: 'Write message'
    ,attachments: 'Attachments'
    ,attachmentsHelp: 'Up to 5 files, maximum 10 MB each.'
    ,addPhoto: 'Add photo'
    ,addFile: 'Add file'
    ,noRecipients: 'Add clients to the database first.'
    ,fileTooLarge: 'A file is larger than 10 MB.'
    ,loadRecipientsError: 'Could not load clients.'
    ,sendFailed: 'Email could not be sent.'
    ,previewSendBlocked: 'Real delivery is not configured. Connect Gmail or Outlook before sending.'
    ,configureEmail: 'Configure email'
    ,aiImproveTitle: 'AI writing assistant'
    ,aiImproveHelp: 'Polish the subject and message while preserving your meaning.'
    ,aiImprove: 'Improve with AI'
    ,aiImproving: 'Improving...'
    ,aiImproveSuccess: 'The email was improved. Review it before sending.'
    ,aiImproveFailed: 'The email could not be improved.'
    ,emailParser: 'Email Parser'
    ,bulkSender: 'Bulk Sender'
    // Email Parser translations
    ,emailParserEyebrow: 'BULK EMAIL'
    ,emailParserTitle: 'Parser & Segmentation'
    ,emailParserSubtitle: 'Import and organize emails by regions'
    ,uploadCsvTitle: '📤 Upload CSV File'
    ,uploadCsvHelp: 'Format: email, name, region (one per line)'
    ,csvPlaceholder: 'Or paste CSV content here...'
    ,parseImport: 'Parse & Import'
    ,validateEmails: 'Validate Emails'
    ,importSuccessTitle: '✅ Import Successful!'
    ,importSuccessText: '{validEmails} valid emails imported from {totalProcessed} lines'
    ,importErrors: '{errorCount} errors found'
    ,regionStatsTitle: '📊 Region Statistics'
    ,regionEmpty: 'No data yet. Upload a CSV to get started.'
    ,regionHeader: 'Region'
    ,countHeader: 'Email Count'
    ,percentHeader: 'Percent'
    ,unknownRegion: 'unknown'
    ,processingCsv: 'Processing...'
    ,csvUploadError: 'Please upload or paste CSV content'
    ,csvImportSuccess: '{count} emails imported successfully!'
    ,validationSuccess: 'Validation complete: {validEmails} valid, {fixedCount} fixed'
    // Bulk Sender translations
    ,bulkSenderEyebrow: 'BULK EMAIL'
    ,bulkSenderTitle: 'Campaign manager'
    ,bulkSenderSubtitle: 'Create and send bulk email campaigns'
    ,newCampaignBtn: 'New campaign'
    ,campaignNameHeader: 'Campaign name'
    ,regionHeader2: 'Region'
    ,statusHeader: 'Status'
    ,recipientsHeader: 'Recipients'
    ,sentHeader: 'Sent'
    ,failedHeader: 'Failed'
    ,actionsHeader: 'Actions'
    ,noCampaigns: 'No campaigns yet. Click “New campaign” to get started.'
    ,statsBtn: 'Stats'
    ,sendBtn: 'Send'
    ,deleteBtn: 'Delete'
    ,createCampaignTitle: 'Create New Campaign'
    ,createCampaignHelp: 'Give your campaign a clear name and compelling content.'
    ,campaignNameLabel: 'Campaign Name'
    ,campaignSubjectLabel: 'Email Subject'
    ,campaignTypeLabel: 'Campaign type'
    ,regularCampaign: 'Regular campaign'
    ,welcomeSeries: 'Welcome series'
    ,selectRecipientsHelp: 'Choose which contacts to send this campaign to.'
    ,bulkAddImage: 'Add photo'
    ,bulkImageOnly: 'Only image files can be attached here.'
    ,targetRegionLabel: 'Target Region (Optional)'
    ,allRegions: 'All Regions'
    ,htmlTemplateLabel: 'Email HTML Template'
    ,htmlTemplateHelper: 'Use {{name}} and {{email}} for personalization'
    ,cancelBtn: 'Cancel'
    ,createBtn: 'Create Campaign'
    ,campaignStatsTitle: 'Campaign Statistics'
    ,campaignRecipients: 'Recipients'
    ,campaignSent: 'Sent'
    ,campaignFailed: 'Failed'
    ,campaignSuccessRate: 'Success rate'
    ,campaignSentDate: 'Sent date'
    ,deliveryProgressLabel: 'Delivery progress'
    ,campaignLabel: 'Campaign: {name}'
    ,createdLabel: 'Created: {date}'
    ,totalRecipientsLabel: 'Total Recipients:'
    ,sentLabel: 'Sent:'
    ,failedLabel: 'Failed:'
    ,openRateLabel: 'Open Rate'
    ,clickRateLabel: 'Click Rate'
    ,bounceRateLabel: 'Bounce Rate'
    ,closeBtn: 'Close'
    ,confirmDelete: 'Are you sure you want to delete this campaign?'
    ,campaignCreatedSuccess: 'Campaign created successfully!'
    ,campaignSentSuccess: 'Campaign sent to {count} recipients!'
    ,campaignDeletedSuccess: 'Campaign deleted'
    ,allFieldsRequired: 'All fields are required'
    ,campaignCreatedError: 'Failed to create campaign'
    ,campaignSendError: 'Failed to send campaign'
    ,campaignDeleteError: 'Failed to delete campaign'
    ,statsLoadError: 'Failed to load stats'
    ,parserDiscoveryEyebrow: 'REGIONAL EMAIL DISCOVERY'
    ,parserDiscoveryTitle: 'Find venue emails'
    ,parserDiscoverySubtitle: 'Select a region, find public company contacts and add them to Bulk Sender.'
    ,parserRegionLabel: 'Region'
    ,parserRegionPlaceholder: 'Example: Botanica, Chisinau'
    ,parserBusinessTypeLabel: 'Business type'
    ,parserSearchPublicEmails: 'Search all public emails'
    ,parserSearchingSelected: 'Searching selected option'
    ,parserAddResearch: 'Add a new research'
    ,parserStop: 'Stop'
    ,parserVerifiedOnly: 'Only addresses published by the company and domains that can receive email are kept.'
    ,parserRegionRequired: 'Enter the region where you want to search for businesses.'
    ,parserNoEmailsNotice: 'Available businesses were analyzed, but no public emails were found.'
    ,parserResearchDone: 'Research complete. The combined base has {count} unique public emails.'
    ,parserSearchStopped: 'Search stopped. Found results were kept.'
    ,parserSearchFailed: 'Business search failed.'
    ,parserImportDone: '{count} verified contacts were added to the email database.'
    ,parserBusinessesScanned: 'Businesses analyzed'
    ,parserWebsitesChecked: 'Websites checked'
    ,parserValidatedEmails: 'Validated emails'
    ,parserFoundContacts: 'Found contacts'
    ,parserAddToDatabase: 'Add {count} to email database'
    ,parserPlaceHeader: 'Place'
    ,parserVerifiedEmailHeader: 'Verified email'
    ,parserPhoneHeader: 'Phone'
    ,parserCategoryHeader: 'Category'
    ,parserAddressSiteHeader: 'Address / site'
    ,parserOfficialDomain: 'Public source + official domain + MX'
    ,parserPublicSource: 'Public source + valid email domain'
    ,parserMxVerified: 'MX verified'
    ,parserMailServerValid: 'valid mail server'
    ,parserPhoneUnavailable: 'Not publicly listed'
    ,parserAddressUnavailable: 'Address not published'
    ,parserOpenWebsite: 'Open official website'
    ,parserWebsiteUnavailable: 'Official website unavailable'
    ,parserNoPublicEmails: 'No public emails found'
    ,parserTryBroader: 'Try all categories or a wider region.'
    ,parserPublicAttribution: 'Contacts are collected only from public information.'
    ,parserCategoryAll: 'All businesses'
    ,parserCategoryRestaurant: 'Restaurants and cafes'
    ,parserCategoryShop: 'Shops'
    ,parserCategoryServices: 'Services and offices'
    ,parserCategoryMedical: 'Clinics and pharmacies'
    ,parserCategoryEducation: 'Educational institutions'
    ,parserCategoryAuto: 'Auto and service'
    ,parserCategoryBeauty: 'Beauty and wellness'
    ,parserCategoryFitness: 'Sports and fitness'
    ,parserCategoryHospitality: 'Hotels and accommodation'
    ,parserCategoryTourism: 'Tourism and agencies'
    ,parserCategoryRealEstate: 'Real estate'
    ,parserCategoryConstruction: 'Construction and repairs'
    ,parserCategoryFinance: 'Banks and accounting'
    ,parserCategoryLegal: 'Legal and notary'
    ,parserCategoryIt: 'IT and telecom'
    ,parserCategoryEntertainment: 'Events and entertainment'
  },
  ro: {
    emailDatabase: 'Baza de emailuri', adminAccess: 'Acces administrator', signIn: 'Autentificare', signingIn: 'Se autentifică...', signInError: 'Autentificarea nu a reușit', loginHelp: 'Autentificarea este necesară înainte de accesarea contactelor și instrumentelor de email.', sendHistory: 'Istoric trimiteri', deliveryStatus: 'Starea livrărilor', systemSettings: 'Setări sistem'
    ,emailParser: 'Email Parser', bulkSender: 'Bulk Sender'
    ,companyTools: 'INSTRUMENTE COMPANIE', administrator: 'Administrator', companyAccess: 'Acces companie', searchDatabase: 'Caută în baza de emailuri...',
    databaseEyebrow: 'BAZA COMPANIEI', databaseTitle: 'Baza de emailuri', databaseSubtitle: 'Selectează clienții și trimite același email tuturor cu un singur click.',
    importCsv: 'Importă CSV', csvTooLarge: 'Fișierul CSV trebuie să aibă maximum 5 MB', contactsLoadError: 'Contactele nu au putut fi încărcate din baza de date', contactAddError: 'Acest email nu a putut fi adăugat', contactDeleteConfirm: 'Ștergi acest contact?', contactDeleted: 'Contact șters', contactDeleteError: 'Acest contact nu a putut fi șters', contactEditTitle: 'Editează numele', contactNameLabel: 'Nume', contactUpdated: 'Numele a fost actualizat', contactUpdateError: 'Numele nu a putut fi actualizat', deleteAll: 'Șterge tot', deleteAllContactsConfirm: 'Ștergi definitiv toate cele {count} contacte din baza de emailuri?', contactsDeleted: '{count} contacte au fost șterse definitiv.', contactsDeleteError: 'Contactele nu au putut fi șterse', csvImportFailed: 'Importul CSV a eșuat', addEmail: 'Adaugă email', companyRecipients: 'Clienții companiei', addressesAvailable: '{count} adrese de email disponibile',
    searchRecipient: 'Caută nume, email sau companie', recipient: 'Client', company: 'Companie', status: 'Stare',
    importTitle: 'Importă baza de emailuri a companiei', importHelp: 'Încarcă un CSV sau adaugă adrese manual. Apoi selectează clienții și trimite imediat.',
    selectedRecipients: '{count} clienți selectați', readyDelivery: 'Pregătit pentru trimitere imediată', clearSelection: 'Șterge selecția', writeSend: 'Scrie și trimite email',
    sendNow: 'Trimite email acum', sendToCount: 'Trimite acum la {count}', sendHelp: 'Mesajul va fi trimis celor {count} clienți selectați.',
    to: 'CĂTRE', more: '+încă {count}', subject: 'Subiect', message: 'Mesaj', messagePlaceholder: 'Scrie mesajul aici...',
    individualNotice: 'Cu un singur click, emailul este trimis tuturor clienților selectați. Fiecare primește un email individual.',
    cancel: 'Anulează', sending: 'Se trimite...', addDatabaseTitle: 'Adaugă email în bază', fullName: 'Nume complet', emailAddress: 'Adresă email',
    tags: 'Etichete', tagsPlaceholder: 'client, partener, echipă', addDatabase: 'Adaugă email', emailAdded: 'Email adăugat în bază',
    imported: 'Au fost importate {imported} din {total} adrese', queued: 'Email trimis cu succes la {count} clienți',
    historyTitle: 'Istoric trimiteri', historySubtitle: 'Vezi mesajele trimise din baza companiei.', sendEmailNow: 'Trimite email acum', last30: 'Ultimele 30 zile',
    last7: 'Ultimele 7 zile', last3Weeks: 'Ultimele 3 săptămâni', last90: 'Ultimele 90 zile', lastYear: 'Ultimul an', allTime: 'Tot timpul',
    recentSends: 'Trimiteri recente', historyEyebrow: 'OPERAȚIUNI INTERNE', historyLoadError: 'Istoricul nu a putut fi încărcat din baza de date', campaignDraftCreated: 'Campania a fost creată și salvată ca schiță', contactsLoadSimpleError: 'Contactele nu au putut fi încărcate', selectOneContact: 'Selectează cel puțin un contact', campaignQueued: '{count} emailuri au fost adăugate în coada de livrare', campaignDeleteConfirmNamed: 'Ștergi „{name}”?', moreEmailsSent: '+{count} emailuri trimise', statusDraft: 'Schiță', statusPending: 'În așteptare', statusQueued: 'În coadă', statusSending: 'Se trimite', statusCompleted: 'Finalizată', statusCompletedWithErrors: 'Finalizată cu erori', statusSent: 'Trimis cu succes', statusFailed: 'Eșuat', statusActive: 'Activ', campaignsLabel: 'Campanii', selectedPeriod: 'În perioada selectată', successfulDeliveries: 'Livrări reușite', sentWithoutErrors: 'Trimise fără eroare', needsReview: 'Necesită verificare', campaignsCount: '{count} campanii', staffMessages: 'Mesaje trimise de angajații companiei.', noEmails: 'Nu a fost trimis niciun email', selectRecipients: 'Selectează clienții',
    systemStatus: 'Starea sistemului', operational: 'Sistem funcțional', openDatabase: 'Deschide baza de emailuri',
    deliveryTitle: 'Starea livrărilor', deliverySubtitle: 'Urmărește trimiterile și rezolvă erorile.', refresh: 'Actualizează', waiting: 'În așteptare',
    sendingNow: 'Se trimit', delivered: 'Livrate', failed: 'Eșuate', deliveryProgress: 'Progres livrare', clearFailed: 'Șterge eșuate',
    retryFailed: 'Reîncearcă', deliveryEyebrow: 'LIVRARE', failedCleared: 'Joburi eșuate șterse', failedRetried: 'Joburi eșuate reîncercate', noFailedJobs: 'Nu există joburi eșuate',
    queueActionFailed: 'Acțiunea pe coadă a eșuat', deliveryActivityHelp: 'Activitate persistentă salvată în baza de date',
    emailJobsLabel: 'Joburi email', deliveryServiceName: 'Serviciu intern de livrare', deliveryServiceAvailable: 'Serviciul de livrare email este disponibil.', serviceAvailability: 'Disponibilitate serviciu',
    queueReady: 'Coada este pregătită', queueReadyHelp: 'Trimiterile vor apărea aici după expedierea unui mesaj.',
    settingsTitle: 'Setări sistem', settingsSubtitle: 'Configurează expeditorul și serviciul de trimitere al companiei.', saveSettings: 'Salvează setările',
    senderIdentity: 'Identitatea expeditorului', senderHelp: 'Ce văd clienții în inbox.', senderName: 'Numele expeditorului', senderEmail: 'Emailul expeditorului',
    emailProvider: 'Serviciu email', providerHelp: 'Alege cum sunt livrate emailurile companiei.', deliveryMethod: 'Metoda de livrare',
    previewMode: 'Mod test (fără emailuri reale)', smtpServer: 'Server SMTP companie', sendgrid: 'SendGrid', smtpHost: 'Gazdă SMTP', port: 'Port',
    username: 'Utilizator', password: 'Parolă', secureTls: 'Folosește conexiune TLS securizată', apiKey: 'Cheie API SendGrid',
    testConnection: 'Testează conexiunea', previewInfo: 'Modul sigur de test este activ. Mesajele nu sunt livrate extern.',
    storedLocally: 'Configurația este salvată local', storedHelp: 'Modificările se aplică imediat trimiterilor viitoare.',
    simpleSettingsHelp: 'Conectează emailul companiei și trimite rapid un mesaj de probă.',
    emailConnection: 'Conectare email', emailConnectionHelp: 'Alege Gmail sau Outlook. Setările tehnice sunt automate.',
    companyEmail: 'Emailul companiei', appPassword: 'Parolă de aplicație',
    appPasswordHelp: 'Folosește parola de aplicație generată de Gmail sau Microsoft, nu parola normală.',
    testEmailTitle: 'Trimite un email de probă', testEmailHelp: 'Introdu adresa ta pentru a verifica trimiterea.',
    testRecipient: 'Email destinatar de probă', sendTestEmail: 'Trimite email de probă',
    settingsSaved: 'Setările au fost salvate', settingsLoadError: 'Setările nu au putut fi încărcate',
    settingsSaveError: 'Setările nu au putut fi salvate', previewTestDone: 'Test procesat în modul de probă. Nu a fost livrat un email real.',
    testEmailSent: 'Emailul de probă a fost trimis', testEmailFailed: 'Emailul de probă nu a putut fi trimis'
    ,sendSuccessTitle: 'Emailuri trimise cu succes'
    ,sendSuccessQueued: 'Emailuri pregătite pentru livrare'
    ,sendSuccessHelp: 'Emailurile vor fi livrate în următoarele minute. Verifică pagina Starea livrărilor pentru progres.'
    ,done: 'Gata'
    ,close: 'Închide'
    ,campaignCode: 'ID campanie'
    ,attachedFileSingular: 'fișier'
    ,attachedFilePlural: 'fișiere'
    ,noName: 'Fără nume'
    ,sendToSelected: 'Trimite la {count}'
    ,composeTitle: 'Compune email'
    ,composeSubtitle: 'Alege clienții, scrie mesajul și atașează fotografii sau documente.'
    ,chooseRecipients: 'Alege clienții'
    ,writeMessage: 'Scrie mesajul'
    ,attachments: 'Atașamente'
    ,attachmentsHelp: 'Maximum 5 fișiere, câte 10 MB fiecare.'
    ,addPhoto: 'Adaugă fotografie'
    ,addFile: 'Adaugă fișier'
    ,noRecipients: 'Adaugă mai întâi clienți în baza de date.'
    ,fileTooLarge: 'Un fișier depășește 10 MB.'
    ,loadRecipientsError: 'Clienții nu au putut fi încărcați.'
    ,sendFailed: 'Emailul nu a putut fi trimis.'
    ,previewSendBlocked: 'Trimiterea reală nu este configurată. Conectează Gmail sau Outlook înainte de expediere.'
    ,configureEmail: 'Configurează emailul'
    ,aiImproveTitle: 'Asistent de scriere AI'
    ,aiImproveHelp: 'Îmbunătățește subiectul și mesajul fără a schimba sensul.'
    ,aiImprove: 'Îmbunătățește cu AI'
    ,aiImproving: 'Se îmbunătățește...'
    ,aiImproveSuccess: 'Emailul a fost îmbunătățit. Verifică-l înainte de trimitere.'
    ,aiImproveFailed: 'Emailul nu a putut fi îmbunătățit.'
    // Email Parser translations
    ,emailParserEyebrow: 'EMAIL MASIV'
    ,emailParserTitle: 'Parser & Segmentare Email'
    ,emailParserSubtitle: 'Importă și organizează emailuri pe regiuni'
    ,uploadCsvTitle: '📤 Upload Fișier CSV'
    ,uploadCsvHelp: 'Format: email, nume, regiunea (one per line)'
    ,csvPlaceholder: 'Sau paste conținut CSV aici...'
    ,parseImport: 'Parse & Import'
    ,validateEmails: 'Validează Emailuri'
    ,importSuccessTitle: '✅ Import Reușit!'
    ,importSuccessText: '{validEmails} emailuri valide importate din {totalProcessed} rânduri'
    ,importErrors: '{errorCount} erori găsite'
    ,regionStatsTitle: '📊 Statistici Regiuni'
    ,regionEmpty: 'Nicio dată încă. Upload un CSV pentru a începe.'
    ,regionHeader: 'Regiunea'
    ,countHeader: 'Nr. Emailuri'
    ,percentHeader: 'Procent'
    ,unknownRegion: 'necunoscut'
    ,processingCsv: 'Se procesează...'
    ,csvUploadError: 'Please upload or paste CSV content'
    ,csvImportSuccess: '{count} emails imported successfully!'
    ,validationSuccess: 'Validation complete: {validEmails} valid, {fixedCount} fixed'
    // Bulk Sender translations
    ,bulkSenderEyebrow: 'EMAIL MASIV'
    ,bulkSenderTitle: 'Manager campanii'
    ,bulkSenderSubtitle: 'Creează și trimite campanii email în masă'
    ,newCampaignBtn: 'Campanie nouă'
    ,campaignNameHeader: 'Nume campanie'
    ,regionHeader2: 'Regiune'
    ,statusHeader: 'Stare'
    ,recipientsHeader: 'Destinatari'
    ,sentHeader: 'Trimise'
    ,failedHeader: 'Eșuate'
    ,actionsHeader: 'Acțiuni'
    ,noCampaigns: 'Nu există campanii. Apasă „Campanie nouă” ca să începi.'
    ,statsBtn: 'Statistici'
    ,sendBtn: 'Trimite'
    ,deleteBtn: 'Șterge'
    ,createCampaignTitle: 'Creează campanie nouă'
    ,createCampaignHelp: 'Dă campaniei un nume clar și conținut convingător.'
    ,campaignNameLabel: 'Nume campanie'
    ,campaignSubjectLabel: 'Subiect email'
    ,campaignTypeLabel: 'Tip campanie'
    ,regularCampaign: 'Campanie obișnuită'
    ,welcomeSeries: 'Serie de bun venit'
    ,selectRecipientsHelp: 'Alege contactele cărora vrei să le trimiți campania.'
    ,bulkAddImage: 'Adaugă fotografie'
    ,bulkImageOnly: 'Aici poți atașa doar imagini.'
    ,targetRegionLabel: 'Regiunea Țintă (Opțional)'
    ,allRegions: 'Toate Regiunile'
    ,htmlTemplateLabel: 'Template HTML Email'
    ,htmlTemplateHelper: 'Folosește {{name}} și {{email}} pentru personalizare'
    ,cancelBtn: 'Anulează'
    ,createBtn: 'Creează campanie'
    ,campaignStatsTitle: 'Statistici campanie'
    ,campaignRecipients: 'Destinatari'
    ,campaignSent: 'Trimise'
    ,campaignFailed: 'Eșuate'
    ,campaignSuccessRate: 'Rată succes'
    ,campaignSentDate: 'Data trimiterii'
    ,deliveryProgressLabel: 'Progres livrare'
    ,campaignLabel: 'Campanie: {name}'
    ,createdLabel: 'Creată: {date}'
    ,totalRecipientsLabel: 'Total destinatari:'
    ,sentLabel: 'Trimise:'
    ,failedLabel: 'Eșuate:'
    ,openRateLabel: 'Rată deschidere'
    ,clickRateLabel: 'Rată click'
    ,bounceRateLabel: 'Rată respingere'
    ,closeBtn: 'Închide'
    ,confirmDelete: 'Sigur vrei să ștergi această campanie?'
    ,campaignCreatedSuccess: 'Campania a fost creată cu succes!'
    ,campaignSentSuccess: 'Campania a fost trimisă la {count} destinatari!'
    ,campaignDeletedSuccess: 'Campania a fost ștearsă'
    ,allFieldsRequired: 'Toate câmpurile sunt obligatorii'
    ,campaignCreatedError: 'Campania nu a putut fi creată'
    ,campaignSendError: 'Campania nu a putut fi trimisă'
    ,campaignDeleteError: 'Campania nu a putut fi ștearsă'
    ,statsLoadError: 'Statisticile nu au putut fi încărcate'
    ,parserDiscoveryEyebrow: 'DESCOPERIRE EMAILURI REGIONALE'
    ,parserDiscoveryTitle: 'Găsește emailurile localurilor'
    ,parserDiscoverySubtitle: 'Selectează regiunea, găsește contactele publice ale companiilor și adaugă-le în Bulk Sender.'
    ,parserRegionLabel: 'Regiune'
    ,parserRegionPlaceholder: 'Exemplu: Botanica, Chișinău'
    ,parserBusinessTypeLabel: 'Tipul localului'
    ,parserSearchPublicEmails: 'Caută toate emailurile publice'
    ,parserSearchingSelected: 'Caută acum opțiunea selectată'
    ,parserAddResearch: 'Adaugă un research nou'
    ,parserStop: 'Oprește'
    ,parserVerifiedOnly: 'Sunt păstrate doar adresele publicate în sursa firmei și ale căror domenii pot primi email.'
    ,parserRegionRequired: 'Introdu regiunea în care vrei să cauți localuri.'
    ,parserNoEmailsNotice: 'Au fost analizate localurile disponibile, dar nu au fost găsite emailuri publice.'
    ,parserResearchDone: 'Research finalizat. Baza cumulată are {count} emailuri publice unice.'
    ,parserSearchStopped: 'Căutarea a fost oprită. Rezultatele găsite au fost păstrate.'
    ,parserSearchFailed: 'Căutarea localurilor a eșuat.'
    ,parserImportDone: '{count} contacte verificate au fost adăugate în baza de emailuri.'
    ,parserBusinessesScanned: 'Localuri analizate'
    ,parserWebsitesChecked: 'Site-uri verificate'
    ,parserValidatedEmails: 'Emailuri validate'
    ,parserFoundContacts: 'Contacte găsite'
    ,parserAddToDatabase: 'Adaugă {count} în baza de emailuri'
    ,parserPlaceHeader: 'Local'
    ,parserVerifiedEmailHeader: 'Email verificat'
    ,parserPhoneHeader: 'Telefon'
    ,parserCategoryHeader: 'Categorie'
    ,parserAddressSiteHeader: 'Adresă / site'
    ,parserOfficialDomain: 'Sursă publică + domeniu oficial + MX'
    ,parserPublicSource: 'Sursă publică + domeniu email valid'
    ,parserMxVerified: 'MX verificat'
    ,parserMailServerValid: 'server email valid'
    ,parserPhoneUnavailable: 'Neafișat public'
    ,parserAddressUnavailable: 'Adresă nepublicată'
    ,parserOpenWebsite: 'Deschide site-ul oficial'
    ,parserWebsiteUnavailable: 'Site oficial indisponibil'
    ,parserNoPublicEmails: 'Nu au fost găsite emailuri publice'
    ,parserTryBroader: 'Încearcă toate categoriile sau o regiune mai largă.'
    ,parserPublicAttribution: 'Contactele sunt preluate numai din informații publice.'
    ,parserCategoryAll: 'Toate localurile'
    ,parserCategoryRestaurant: 'Restaurante și cafenele'
    ,parserCategoryShop: 'Magazine'
    ,parserCategoryServices: 'Servicii și oficii'
    ,parserCategoryMedical: 'Clinici și farmacii'
    ,parserCategoryEducation: 'Instituții educaționale'
    ,parserCategoryAuto: 'Auto și service'
    ,parserCategoryBeauty: 'Frumusețe și wellness'
    ,parserCategoryFitness: 'Sport și fitness'
    ,parserCategoryHospitality: 'Hoteluri și cazare'
    ,parserCategoryTourism: 'Turism și agenții'
    ,parserCategoryRealEstate: 'Imobiliare'
    ,parserCategoryConstruction: 'Construcții și reparații'
    ,parserCategoryFinance: 'Bănci și contabilitate'
    ,parserCategoryLegal: 'Juridic și notarial'
    ,parserCategoryIt: 'IT și telecom'
    ,parserCategoryEntertainment: 'Evenimente și divertisment'
  },
  ru: {
    emailDatabase: 'База email', adminAccess: 'Доступ администратора', signIn: 'Войти', signingIn: 'Вход...', signInError: 'Не удалось войти', loginHelp: 'Требуется вход перед доступом к контактам и email-инструментам.', sendHistory: 'История отправок', deliveryStatus: 'Статус доставки', systemSettings: 'Настройки системы',
    companyTools: 'ИНСТРУМЕНТЫ КОМПАНИИ', administrator: 'Администратор', companyAccess: 'Доступ компании', searchDatabase: 'Поиск в базе email...',
    databaseEyebrow: 'БАЗА КОМПАНИИ', databaseTitle: 'База email', databaseSubtitle: 'Выберите клиентов и отправьте одно сообщение всем одним нажатием.',
    importCsv: 'Импорт CSV', csvTooLarge: 'CSV-файл должен быть не больше 5 МБ', contactsLoadError: 'Контакты не удалось загрузить из базы данных', contactAddError: 'Не удалось добавить этот email', contactDeleteConfirm: 'Удалить этот контакт?', contactDeleted: 'Контакт удалён', contactDeleteError: 'Не удалось удалить этот контакт', contactEditTitle: 'Изменить имя', contactNameLabel: 'Имя', contactUpdated: 'Имя обновлено', contactUpdateError: 'Не удалось обновить имя', deleteAll: 'Удалить всё', deleteAllContactsConfirm: 'Навсегда удалить все контакты из базы email: {count}?', contactsDeleted: 'Контакты навсегда удалены: {count}.', contactsDeleteError: 'Не удалось удалить контакты', csvImportFailed: 'Импорт CSV не удался', addEmail: 'Добавить email', companyRecipients: 'Клиенты компании', addressesAvailable: 'Доступно адресов: {count}',
    searchRecipient: 'Поиск по имени, email или компании', recipient: 'Клиент', company: 'Компания', status: 'Статус',
    importTitle: 'Импорт базы email компании', importHelp: 'Загрузите CSV или добавьте адреса вручную. Затем выберите клиентов и отправьте сообщение.',
    selectedRecipients: 'Выбрано клиентов: {count}', readyDelivery: 'Готово к немедленной отправке', clearSelection: 'Очистить выбор', writeSend: 'Написать и отправить',
    sendNow: 'Отправить сейчас', sendToCount: 'Отправить для {count}', sendHelp: 'Сообщение будет отправлено выбранным клиентам: {count}.',
    to: 'КОМУ', more: '+ещё {count}', subject: 'Тема', message: 'Сообщение', messagePlaceholder: 'Напишите сообщение...',
    individualNotice: 'Одним нажатием письмо будет отправлено всем выбранным клиентам. Каждый получит отдельное письмо.',
    cancel: 'Отмена', sending: 'Отправка...', addDatabaseTitle: 'Добавить email в базу', fullName: 'Полное имя', emailAddress: 'Email адрес',
    tags: 'Метки', tagsPlaceholder: 'клиент, партнёр, команда', addDatabase: 'Добавить email', emailAdded: 'Email добавлен в базу',
    imported: 'Импортировано {imported} из {total} адресов', queued: 'Письмо успешно отправлено {count} клиентам',
    historyTitle: 'История отправок', historySubtitle: 'Просмотр сообщений, отправленных из базы компании.', sendEmailNow: 'Отправить email', last30: 'Последние 30 дней',
    last7: 'Последние 7 дней', last3Weeks: 'Последние 3 недели', last90: 'Последние 90 дней', lastYear: 'Последний год', allTime: 'За всё время',
    recentSends: 'Последние отправки', historyEyebrow: 'ВНУТРЕННИЕ ОПЕРАЦИИ', historyLoadError: 'Историю не удалось загрузить из базы данных', campaignDraftCreated: 'Кампания создана и сохранена как черновик', contactsLoadSimpleError: 'Не удалось загрузить контакты', selectOneContact: 'Выберите хотя бы один контакт', campaignQueued: 'Письма добавлены в очередь доставки: {count}', campaignDeleteConfirmNamed: 'Удалить «{name}»?', moreEmailsSent: '+ещё отправлено писем: {count}', statusDraft: 'Черновик', statusPending: 'Ожидает', statusQueued: 'В очереди', statusSending: 'Отправляется', statusCompleted: 'Завершена', statusCompletedWithErrors: 'Завершена с ошибками', statusSent: 'Успешно отправлено', statusFailed: 'Ошибка', statusActive: 'Активен', campaignsLabel: 'Кампании', selectedPeriod: 'За выбранный период', successfulDeliveries: 'Успешные доставки', sentWithoutErrors: 'Отправлены без ошибок', needsReview: 'Требует проверки', campaignsCount: 'Кампаний: {count}', staffMessages: 'Сообщения сотрудников компании.', noEmails: 'Письма ещё не отправлялись', selectRecipients: 'Выбрать клиентов',
    systemStatus: 'Статус системы', operational: 'Система работает', openDatabase: 'Открыть базу email',
    deliveryTitle: 'Статус доставки', deliverySubtitle: 'Контролируйте отправки и исправляйте ошибки.', refresh: 'Обновить', waiting: 'Ожидают',
    sendingNow: 'Отправляются', delivered: 'Доставлены', failed: 'Ошибки', deliveryProgress: 'Прогресс доставки', clearFailed: 'Очистить ошибки',
    retryFailed: 'Повторить', deliveryEyebrow: 'ДОСТАВКА', failedCleared: 'Ошибочные задачи очищены', failedRetried: 'Ошибочные задачи повторены', noFailedJobs: 'Ошибочных задач нет',
    queueActionFailed: 'Действие с очередью не удалось', deliveryActivityHelp: 'Постоянная история доставки из базы данных',
    emailJobsLabel: 'Email-задачи', deliveryServiceName: 'Внутренний сервис доставки', deliveryServiceAvailable: 'Сервис доставки email доступен.', serviceAvailability: 'Доступность сервиса',
    queueReady: 'Очередь готова', queueReadyHelp: 'Отправки появятся здесь после отправки сообщения.',
    settingsTitle: 'Настройки системы', settingsSubtitle: 'Настройте отправителя и сервис доставки компании.', saveSettings: 'Сохранить',
    senderIdentity: 'Данные отправителя', senderHelp: 'Что клиенты увидят во входящих.', senderName: 'Имя отправителя', senderEmail: 'Email отправителя',
    emailProvider: 'Почтовый сервис', providerHelp: 'Выберите способ доставки писем.', deliveryMethod: 'Способ доставки',
    previewMode: 'Тестовый режим (без реальных писем)', smtpServer: 'SMTP сервер компании', sendgrid: 'SendGrid', smtpHost: 'SMTP сервер', port: 'Порт',
    username: 'Пользователь', password: 'Пароль', secureTls: 'Использовать защищённое TLS соединение', apiKey: 'API ключ SendGrid',
    testConnection: 'Проверить соединение', previewInfo: 'Безопасный тестовый режим активен. Письма не отправляются наружу.',
    storedLocally: 'Настройки сохранены локально', storedHelp: 'Изменения сразу применяются к будущим отправкам.',
    simpleSettingsHelp: 'Подключите почту компании и отправьте тестовое сообщение.',
    emailConnection: 'Подключение почты', emailConnectionHelp: 'Выберите Gmail или Outlook. Технические настройки автоматические.',
    companyEmail: 'Email компании', appPassword: 'Пароль приложения',
    appPasswordHelp: 'Используйте пароль приложения Gmail или Microsoft, а не обычный пароль.',
    testEmailTitle: 'Отправить тестовое письмо', testEmailHelp: 'Введите свой адрес, чтобы проверить отправку.',
    testRecipient: 'Тестовый email получателя', sendTestEmail: 'Отправить тест',
    settingsSaved: 'Настройки сохранены', settingsLoadError: 'Не удалось загрузить настройки',
    settingsSaveError: 'Не удалось сохранить настройки', previewTestDone: 'Тест обработан в пробном режиме. Реальное письмо не доставлено.',
    testEmailSent: 'Тестовое письмо отправлено', testEmailFailed: 'Не удалось отправить тестовое письмо'
    ,sendSuccessTitle: 'Письма успешно отправлены'
    ,sendSuccessQueued: 'Письма поставлены в очередь доставки'
    ,sendSuccessHelp: 'Письма будут доставлены в ближайшие минуты. Проверьте страницу статуса доставки.'
    ,done: 'Готово'
    ,close: 'Закрыть'
    ,campaignCode: 'ID кампании'
    ,attachedFileSingular: 'файл'
    ,attachedFilePlural: 'файлов'
    ,noName: 'Без имени'
    ,sendToSelected: 'Отправить {count}'
    ,composeTitle: 'Создать письмо'
    ,composeSubtitle: 'Выберите клиентов, напишите сообщение и прикрепите фото или документы.'
    ,chooseRecipients: 'Выберите клиентов'
    ,writeMessage: 'Напишите сообщение'
    ,attachments: 'Вложения'
    ,attachmentsHelp: 'До 5 файлов, максимум 10 МБ каждый.'
    ,addPhoto: 'Добавить фото'
    ,addFile: 'Добавить файл'
    ,noRecipients: 'Сначала добавьте клиентов в базу.'
    ,fileTooLarge: 'Размер файла превышает 10 МБ.'
    ,loadRecipientsError: 'Не удалось загрузить клиентов.'
    ,sendFailed: 'Не удалось отправить письмо.'
    ,previewSendBlocked: 'Реальная отправка не настроена. Подключите Gmail или Outlook.'
    ,configureEmail: 'Настроить почту'
    ,aiImproveTitle: 'AI-помощник'
    ,aiImproveHelp: 'Улучшает тему и текст, сохраняя исходный смысл.'
    ,aiImprove: 'Улучшить с AI'
    ,aiImproving: 'Улучшение...'
    ,aiImproveSuccess: 'Письмо улучшено. Проверьте его перед отправкой.'
    ,aiImproveFailed: 'Не удалось улучшить письмо.'
    ,emailParser: 'Парсер Email'
    ,bulkSender: 'Массовая рассылка'
    // Email Parser translations
    ,emailParserEyebrow: 'МАССОВАЯ ПОЧТА'
    ,emailParserTitle: 'Парсер и Сегментация'
    ,emailParserSubtitle: 'Импортируйте и организуйте письма по регионам'
    ,uploadCsvTitle: '📤 Загрузить CSV'
    ,uploadCsvHelp: 'Формат: email, имя, регион (по одному в строке)'
    ,csvPlaceholder: 'Или вставьте содержимое CSV здесь...'
    ,parseImport: 'Парсить и Импортировать'
    ,validateEmails: 'Проверить письма'
    ,importSuccessTitle: '✅ Импорт успешен!'
    ,importSuccessText: '{validEmails} действительных писем импортировано из {totalProcessed} строк'
    ,importErrors: '{errorCount} ошибок найдено'
    ,regionStatsTitle: '📊 Статистика по регионам'
    ,regionEmpty: 'Данных нет. Загрузите CSV для начала.'
    ,regionHeader: 'Регион'
    ,countHeader: 'Количество писем'
    ,percentHeader: 'Процент'
    ,unknownRegion: 'неизвестно'
    ,processingCsv: 'Обработка...'
    ,csvUploadError: 'Пожалуйста, загрузите или вставьте содержимое CSV'
    ,csvImportSuccess: '{count} писем успешно импортировано!'
    ,validationSuccess: 'Проверка завершена: {validEmails} действительных, {fixedCount} исправлено'
    // Bulk Sender translations
    ,bulkSenderEyebrow: 'МАССОВАЯ ПОЧТА'
    ,bulkSenderTitle: 'Менеджер Кампаний'
    ,bulkSenderSubtitle: 'Создавайте и отправляйте массовые письма'
    ,newCampaignBtn: 'Новая Кампания'
    ,campaignNameHeader: 'Название Кампании'
    ,regionHeader2: 'Регион'
    ,statusHeader: 'Статус'
    ,recipientsHeader: 'Получатели'
    ,sentHeader: 'Отправлено'
    ,failedHeader: 'Ошибки'
    ,actionsHeader: 'Действия'
    ,noCampaigns: 'Нет кампаний. Нажмите "Новая Кампания" для начала.'
    ,statsBtn: 'Статистика'
    ,sendBtn: 'Отправить'
    ,deleteBtn: 'Удалить'
    ,createCampaignTitle: 'Создать новую кампанию'
    ,createCampaignHelp: 'Дайте кампании понятное имя и убедительное содержание.'
    ,campaignNameLabel: 'Название Кампании'
    ,campaignSubjectLabel: 'Тема письма'
    ,campaignTypeLabel: 'Тип кампании'
    ,regularCampaign: 'Обычная кампания'
    ,welcomeSeries: 'Приветственная серия'
    ,selectRecipientsHelp: 'Выберите контакты, которым нужно отправить кампанию.'
    ,bulkAddImage: 'Добавить фото'
    ,bulkImageOnly: 'Здесь можно прикреплять только изображения.'
    ,targetRegionLabel: 'Целевой регион (Опционально)'
    ,allRegions: 'Все Регионы'
    ,htmlTemplateLabel: 'HTML Шаблон письма'
    ,htmlTemplateHelper: 'Используйте {{name}} и {{email}} для персонализации'
    ,cancelBtn: 'Отмена'
    ,createBtn: 'Создать Кампанию'
    ,campaignStatsTitle: 'Статистика Кампании'
    ,campaignRecipients: 'Получатели'
    ,campaignSent: 'Отправлено'
    ,campaignFailed: 'Ошибки'
    ,campaignSuccessRate: 'Успешность'
    ,campaignSentDate: 'Дата отправки'
    ,deliveryProgressLabel: 'Прогресс доставки'
    ,campaignLabel: 'Кампания: {name}'
    ,createdLabel: 'Создано: {date}'
    ,totalRecipientsLabel: 'Всего получателей:'
    ,sentLabel: 'Отправлено:'
    ,failedLabel: 'Ошибок:'
    ,openRateLabel: 'Процент открытий'
    ,clickRateLabel: 'Процент кликов'
    ,bounceRateLabel: 'Процент возвратов'
    ,closeBtn: 'Закрыть'
    ,confirmDelete: 'Вы уверены, что хотите удалить эту кампанию?'
    ,campaignCreatedSuccess: 'Кампания успешно создана!'
    ,campaignSentSuccess: 'Кампания отправлена {count} получателям!'
    ,campaignDeletedSuccess: 'Кампания удалена'
    ,allFieldsRequired: 'Все поля обязательны'
    ,campaignCreatedError: 'Ошибка при создании кампании'
    ,campaignSendError: 'Ошибка при отправке кампании'
    ,campaignDeleteError: 'Ошибка при удалении кампании'
    ,statsLoadError: 'Ошибка при загрузке статистики'
    ,parserDiscoveryEyebrow: 'ПОИСК EMAIL ПО РЕГИОНУ'
    ,parserDiscoveryTitle: 'Найти email компаний'
    ,parserDiscoverySubtitle: 'Выберите регион, найдите публичные контакты компаний и добавьте их в Bulk Sender.'
    ,parserRegionLabel: 'Регион'
    ,parserRegionPlaceholder: 'Пример: Ботаника, Кишинёв'
    ,parserBusinessTypeLabel: 'Тип компании'
    ,parserSearchPublicEmails: 'Искать все публичные email'
    ,parserSearchingSelected: 'Идёт поиск выбранной категории'
    ,parserAddResearch: 'Добавить новый поиск'
    ,parserStop: 'Остановить'
    ,parserVerifiedOnly: 'Сохраняются только адреса, опубликованные компанией, и домены, которые могут принимать email.'
    ,parserRegionRequired: 'Введите регион, в котором нужно искать компании.'
    ,parserNoEmailsNotice: 'Доступные компании были проанализированы, но публичные email не найдены.'
    ,parserResearchDone: 'Поиск завершён. В общей базе {count} уникальных публичных email.'
    ,parserSearchStopped: 'Поиск остановлен. Найденные результаты сохранены.'
    ,parserSearchFailed: 'Поиск компаний не удался.'
    ,parserImportDone: '{count} проверенных контактов добавлено в базу email.'
    ,parserBusinessesScanned: 'Компаний проанализировано'
    ,parserWebsitesChecked: 'Сайтов проверено'
    ,parserValidatedEmails: 'Email проверено'
    ,parserFoundContacts: 'Найденные контакты'
    ,parserAddToDatabase: 'Добавить {count} в базу email'
    ,parserPlaceHeader: 'Компания'
    ,parserVerifiedEmailHeader: 'Проверенный email'
    ,parserPhoneHeader: 'Телефон'
    ,parserCategoryHeader: 'Категория'
    ,parserAddressSiteHeader: 'Адрес / сайт'
    ,parserOfficialDomain: 'Публичный источник + официальный домен + MX'
    ,parserPublicSource: 'Публичный источник + действительный email-домен'
    ,parserMxVerified: 'MX проверен'
    ,parserMailServerValid: 'почтовый сервер действителен'
    ,parserPhoneUnavailable: 'Не опубликован'
    ,parserAddressUnavailable: 'Адрес не опубликован'
    ,parserOpenWebsite: 'Открыть официальный сайт'
    ,parserWebsiteUnavailable: 'Официальный сайт недоступен'
    ,parserNoPublicEmails: 'Публичные email не найдены'
    ,parserTryBroader: 'Попробуйте все категории или более широкий регион.'
    ,parserPublicAttribution: 'Контакты собираются только из публичной информации.'
    ,parserCategoryAll: 'Все компании'
    ,parserCategoryRestaurant: 'Рестораны и кафе'
    ,parserCategoryShop: 'Магазины'
    ,parserCategoryServices: 'Услуги и офисы'
    ,parserCategoryMedical: 'Клиники и аптеки'
    ,parserCategoryEducation: 'Образовательные учреждения'
    ,parserCategoryAuto: 'Авто и сервис'
    ,parserCategoryBeauty: 'Красота и wellness'
    ,parserCategoryFitness: 'Спорт и фитнес'
    ,parserCategoryHospitality: 'Отели и проживание'
    ,parserCategoryTourism: 'Туризм и агентства'
    ,parserCategoryRealEstate: 'Недвижимость'
    ,parserCategoryConstruction: 'Строительство и ремонт'
    ,parserCategoryFinance: 'Банки и бухгалтерия'
    ,parserCategoryLegal: 'Юридические и нотариальные услуги'
    ,parserCategoryIt: 'IT и телеком'
    ,parserCategoryEntertainment: 'События и развлечения'
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('mailCenterLanguage') || 'ro');
  const value = useMemo(() => ({
    language,
    setLanguage: (next) => {
      localStorage.setItem('mailCenterLanguage', next);
      setLanguage(next);
    },
    t: (key, params = {}) => {
      let text = translations[language]?.[key] || translations.en[key] || key;
      Object.entries(params).forEach(([name, value]) => {
        text = text.replaceAll(`{${name}}`, value);
      });
      return text;
    }
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
