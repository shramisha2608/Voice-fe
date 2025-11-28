import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  TextField,
  Button,
  Select,
  MenuItem,
  Divider,
  Switch,
  styled,
  Snackbar,
  Alert,
  // 🌟 Import Grid for 3-per-row layout
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete'; // Import Delete Icon
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'; // Icon for files

// --- Imports ---
import DropDownIcon from '../../../assets/icons/dropdown.svg';
import ModelIcon from '../../../assets/icons/voice_icon.svg';
import TrainIcon from '../../../assets/icons/train_ai.svg';
import GenerateIcon from '../../../assets/icons/generate.svg';
import UploadIcon from '../../../assets/icons/upload.svg';

// --- STYLED DEFINITIONS (Assumed unchanged) ---
const GreenSwitch = styled((props) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 38,
  height: 22,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#00C853',
        opacity: 1,
        border: 0,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#33cf4d',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.grey[100],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.7,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 18,
    height: 18,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: '#E9E9EA',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

const FormLabel = React.memo(({ children, required }) => (
  <Typography
    variant="subtitle2"
    sx={{
      fontWeight: 600,
      mb: 0.5,
      fontSize: '13px',
      color: 'rgba(0, 0, 0, 1)',
    }}
  >
    {children} {required && <span style={{ color: 'red' }}>*</span>}
  </Typography>
));
FormLabel.displayName = 'FormLabel';

const CustomSelectIcon = React.memo((props) => {
  return (
    <img
      src={DropDownIcon}
      alt="arrow"
      {...props}
      style={{
        width: '12px',
        height: '12px',
        marginRight: '8px',
      }}
    />
  );
});
CustomSelectIcon.displayName = 'CustomSelectIcon';


// --- API DEFINITIONS ---
const API_BASE_URL = 'http://localhost:6565/api/v1/admin/agents';
const GENERATE_PROMPT_URL = `${API_BASE_URL}/generate-prompt`;
// 🌟 NOTE: Assuming a DELETE endpoint for existing files. E.g.,
// const DELETE_FILE_URL = `${API_BASE_URL}/delete-file`; // Placeholder

// --- UTILITY FUNCTION FOR FILE UPLOAD API CALL (Kept as is) ---
const uploadFileApi = async (agentId, file) => {
  if (!agentId) {
    console.error('[FRONTEND DEBUG] Cannot upload: Agent ID is missing.');
    return { success: false, message: 'Missing Agent ID for file upload.' };
  }
  const UPLOAD_URL = `${API_BASE_URL}/upload/${agentId}`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log(`[FRONTEND DEBUG] Attempting upload for Agent ID: ${agentId}, File: ${file.name}. URL: ${UPLOAD_URL}`);
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => {
      return { message: `Server error or unexpected response type (Status: ${response.status}).` };
    });

    if (!response.ok) {
      console.error('[FRONTEND DEBUG] Upload Failed:', data.message || `File upload failed with status ${response.status}`);
      return {
        success: false,
        message: data.message || `File upload failed with status ${response.status}`
      };
    }

    console.log('[FRONTEND DEBUG] Upload Successful. Server Data:', data);
    return { success: true, message: data.message || `File ${file.name} uploaded successfully.`, fileName: file.name };

  } catch (error) {
    console.error('[FRONTEND DEBUG] File Upload Network Error:', error);
    return { success: false, message: `Network error during file upload for ${file.name}: ${error.message}` };
  }
};


// 🌟 NEW/UPDATED: Component for displaying and managing a single file
const FileDisplayComponent = React.memo(({ name, isNew, onDelete }) => {
  // Determine status text (kept for tooltip/accessibility)
  const statusText = isNew ? 'Staged' : 'Existing';

  // ✅ MODIFIED: Set statusColor to always be black
  const statusColor = 'rgba(0, 0, 0, 1)';

  // Shorten long filenames for display
  const displayName = name.length > 20 ? `${name.substring(0, 10)}...${name.substring(name.length - 8)}` : name;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1,
        // ✅ Removed Background Color property
        // backgroundColor: bgColor, // Previously commented out, ensuring it's not used
        borderRadius: 1,
        border: '1px solid #ccc',
      }}
      title={name} // Show full name on hover
    >
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flexGrow: 1 }}>
        {/* ✅ MODIFIED: Set icon color to a constant dark grey */}
        <InsertDriveFileIcon
          fontSize="small"
          sx={{ color: 'rgba(0, 0, 0, 0.7)', mr: 0.5 }}
        />
        <Typography
          variant="body2"
          // ✅ MODIFIED: Use the black statusColor for text
          color={statusColor}
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 'bold'
          }}
        >
          {displayName}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onDelete}
        sx={{ color: 'red', ml: 1, p: 0.5 }}
        title={`Remove ${statusText} file`}
      >
        <DeleteIcon fontSize="small" /> {/* Smaller icon */}
      </IconButton>
    </Box>
  );
});
FileDisplayComponent.displayName = 'FileDisplayComponent';


// --- The Component ---
const AddAgentForm = ({ open, onClose, onSubmit, onSuccess, initialData }) => {

  // --- CONSTANTS ---
  const MAX_FILES_ALLOWED = 5; // Enforce maximum limit of 5 files (existing + staged)

  const fileInputRef = useRef(null);

  // --- FORM STATE ---
  const [formState, setFormState] = useState({
    name: '',
    voice: 'Elliot',
    status: true,
    createPrompt: '',
    systemPrompt: '',
    knowledgeBaseFiles: [], // Array to hold new files to upload (File objects)
    transcriptOutputLanguage: 'English',
    backendId: null,
    displayId: null,
    existingFileNames: [], // Array to hold names of existing files (string names)
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });


  // CORE FIX: Effect to populate form when initialData changes
  useEffect(() => {
    if (open && initialData) {
      // --- Status Logic ---
      let statusValue = initialData.status;
      if (typeof statusValue === 'string') {
        statusValue = statusValue.toUpperCase();
      }
      const isStatusActive = statusValue === true || statusValue === 'ACTIVE';

      // 🌟 UPDATED LOGIC: Get the list of existing filenames.
      let existingNames = [];
      if (initialData.knowledgeBaseFileName) {
        if (Array.isArray(initialData.knowledgeBaseFileName)) {
          existingNames = initialData.knowledgeBaseFileName;
        } else if (typeof initialData.knowledgeBaseFileName === 'string') {
          // Fallback for single file stored as a string
          existingNames = [initialData.knowledgeBaseFileName];
        }
      }
      
      // Ensure no duplicates or empty strings
      existingNames = Array.from(new Set(existingNames.filter(Boolean)));


      // IDs: Database ID for API calls and Agent ID for display
      const correctBackendId = initialData._id || initialData.id || null;
      const userFriendlyId = initialData.agentId || correctBackendId || null;

      setFormState({
        name: initialData.name || '',
        voice: initialData.voice || 'Elliot',
        status: isStatusActive,
        createPrompt: '',
        systemPrompt: initialData.systemPrompt || '',
        knowledgeBaseFiles: [], // Always reset the selected new files on edit load
        transcriptOutputLanguage: initialData.transcriptOutputLanguage || 'English',
        backendId: correctBackendId,
        displayId: userFriendlyId,
        existingFileNames: existingNames, // 🌟 Set the list of existing filenames
      });
    } else if (open === false) {
      // ADD MODE / On Close: Reset form to empty defaults when the drawer closes
      setFormState({
        name: '',
        voice: 'Elliot',
        status: true,
        createPrompt: '',
        systemPrompt: '',
        knowledgeBaseFiles: [],
        transcriptOutputLanguage: 'English',
        backendId: null,
        displayId: null,
        existingFileNames: [],
      });
    }
  }, [initialData, open]);


  // --- HANDLERS ---
  const handleChange = useCallback((e) => {
    const { name, value, checked, type } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Handles triggering the file input.
  const handleFileUploadClick = useCallback(() => {
    fileInputRef.current.click();
  }, []);

  // ✅ MODIFIED: File selection handler to enforce MAX_FILES_ALLOWED
  const handleFileChange = useCallback((e) => {
    const newFiles = Array.from(e.target.files);

    const currentExistingCount = formState.existingFileNames.length;
    const currentStagedCount = formState.knowledgeBaseFiles.length;
    const currentTotal = currentExistingCount + currentStagedCount;

    const availableSlots = MAX_FILES_ALLOWED - currentTotal;

    // 1. Pre-check: If no slots are available, block the operation immediately
    if (availableSlots <= 0) {
      setSnackbar({
        open: true,
        message: `Cannot add more files. The maximum limit of ${MAX_FILES_ALLOWED} file(s) has been reached.`,
        severity: 'error'
      });
      e.target.value = null; // Clear input
      return;
    }

    // 2. Filter for valid file types
    const validFiles = newFiles.filter(file => {
      const fileName = file.name;
      // Get extension after the last dot
      const fileExtension = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2);
      if (fileExtension.toLowerCase() !== 'txt') {
        // Show error for this specific file, but continue filtering others
        setSnackbar({
          open: true,
          message: `Invalid file type: '${fileName}'. Only .txt files are allowed.`,
          severity: 'error'
        });
        return false;
      }
      return true;
    });

    // 3. Apply the maximum limit to the valid files
    const filesToStage = validFiles.slice(0, availableSlots);

    if (filesToStage.length > 0) {
      // Add accepted files to the array of files staged for upload
      setFormState(prev => ({
        ...prev,
        knowledgeBaseFiles: [...prev.knowledgeBaseFiles, ...filesToStage],
      }));

      // 4. Provide feedback
      if (validFiles.length > filesToStage.length) {
        // Warn the user that some valid files were rejected due to the limit
        setSnackbar({
          open: true,
          message: `Added ${filesToStage.length} file(s). ${validFiles.length - filesToStage.length} file(s) skipped to maintain the ${MAX_FILES_ALLOWED}-file total limit.`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `${filesToStage.length} file(s) selected for upload. Click Save to proceed.`,
          severity: 'info',
        });
      }
    } else if (newFiles.length > 0 && availableSlots > 0) {
      // Edge case: User selected files but all were invalid file types
      setSnackbar({
        open: true,
        message: `No files were selected. Ensure files are .TXT format.`,
        severity: 'warning',
      });
    }

    // Always clear the file input value so the same file can be selected again
    e.target.value = null;

  }, [formState.existingFileNames.length, formState.knowledgeBaseFiles.length]);

  // Handler to remove a newly staged file
  const handleRemoveStagedFile = useCallback((fileToRemove) => {
    setFormState(prev => ({
      ...prev,
      knowledgeBaseFiles: prev.knowledgeBaseFiles.filter(file => file !== fileToRemove),
    }));
    setSnackbar({ open: true, message: `Removed staged file: ${fileToRemove.name}`, severity: 'info' });
  }, []);

  // 🌟 NEW: Handler to remove an existing file
  // NOTE: This simulates the action. A real application requires an API call to the backend.
  const handleRemoveExistingFile = useCallback(async (fileNameToRemove) => {
    if (!window.confirm(`Are you sure you want to delete the existing file: ${fileNameToRemove}?`)) {
      return;
    }

    //  2. Update local state upon successful (or assumed successful) deletion
    setFormState(prev => ({
      ...prev,
      existingFileNames: prev.existingFileNames.filter(name => name !== fileNameToRemove),
    }));
    setSnackbar({ open: true, message: `Existing file deleted: ${fileNameToRemove}`, severity: 'success' });

    // Optional: Call onSuccess to refresh parent list if needed
    // onSuccess(); 
  }, []);


  // Handler for the 'Generate' button using the Meta-Prompt backend endpoint (Kept as is)
  const handleGeneratePrompt = useCallback(async () => {
    const userPrompt = formState.createPrompt;

    if (!userPrompt.trim()) {
      setSnackbar({ open: true, message: 'Please write a prompt description first.', severity: 'warning' });
      return;
    }

    setLoading(true);
    setFormState(prev => ({ ...prev, systemPrompt: 'Generating prompt using Gemini API... Please wait.' }));

    try {
      const response = await fetch(GENERATE_PROMPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ createPrompt: userPrompt }),
      });

      const data = await response.json();

      if (response.ok && data.status) {
        setFormState(prev => ({ ...prev, systemPrompt: data.systemPrompt }));
        setSnackbar({ open: true, message: 'System Prompt generated successfully!', severity: 'success' });
      } else {
        setFormState(prev => ({ ...prev, systemPrompt: '' }));
        setSnackbar({ open: true, message: data.message || 'Prompt generation failed. Check backend logs.', severity: 'error' });
      }
    } catch (error) {
      setFormState(prev => ({ ...prev, systemPrompt: '' }));
      console.error("Network or fetch error during prompt generation:", error);
      setSnackbar({ open: true, message: 'Network error connecting to the prompt generation service.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [formState.createPrompt]);


  // ✅ Final File Validation Check in handleSubmit (Only checks for > 5)
  const handleSubmit = useCallback(async () => {
    if (!formState.name || !formState.voice || !formState.transcriptOutputLanguage) {
      setSnackbar({ open: true, message: 'Please fill all required fields.', severity: 'warning' });
      return;
    }

    // 🛑 KNOWLEDGE BASE FILE VALIDATION (Maximum 5 Only) 🛑
    const totalExistingFiles = formState.existingFileNames.length;
    const totalStagedFiles = formState.knowledgeBaseFiles.length;
    const totalFilesAfterUpload = totalExistingFiles + totalStagedFiles;

    // ✅ CHECK FOR MAXIMUM LIMIT (6 or more files are NOT allowed)
    if (totalFilesAfterUpload > MAX_FILES_ALLOWED) {
      setSnackbar({
        open: true,
        message: `The Agent cannot exceed ${MAX_FILES_ALLOWED} Knowledge Base file(s). Please remove ${totalFilesAfterUpload - MAX_FILES_ALLOWED} file(s) before saving.`,
        severity: 'warning'
      });
      return; // Stop the submission
    }
    // 🛑 END VALIDATION 🛑

    setLoading(true);

    try {
      const isStatusActive = formState.status;
      const apiStatus = isStatusActive ? 'ACTIVE' : 'INACTIVE';
      const isEditMode = !!formState.backendId;

      const agentPayload = {
        name: formState.name,
        voice: formState.voice,
        status: apiStatus,
        systemPrompt: formState.systemPrompt,
        transcriptOutputLanguage: formState.transcriptOutputLanguage,
        ...(isEditMode && {
          id: formState.backendId,
          _id: formState.backendId,
          agentId: formState.backendId,
        }),
      };

      // --- STEP 1: Create/Update the Agent ---
      const agentResult = await onSubmit(agentPayload);

      if (!agentResult.success) {
        setSnackbar({ open: true, message: agentResult.message, severity: 'error' });
        return;
      }

      const agentIdForUpload =
        formState.backendId || // Existing ID (Edit Mode)
        agentResult.data?.data?._id || // New ID (Create Mode, common MongoDB response)
        agentResult.data?.data?.id ||
        agentResult.data?.data;

      if (!agentIdForUpload) {
        setSnackbar({ open: true, message: "Agent created/updated, but unique ID was missing for file upload. File upload skipped. File status cannot be updated.", severity: 'warning' });
        onSuccess();
        return;
      }

      let fileUploadSuccessCount = 0;
      let fileUploadFailureCount = 0;
      let finalFileMessage = '';

      // --- STEP 2: Handle File Upload if new files were selected ---
      if (formState.knowledgeBaseFiles.length > 0) {

        // Use Promise.allSettled to handle multiple uploads concurrently
        const uploadPromises = formState.knowledgeBaseFiles.map(file =>
          uploadFileApi(agentIdForUpload, file)
        );

        const results = await Promise.allSettled(uploadPromises);

        let newlyUploadedFileNames = [];

        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            fileUploadSuccessCount++;
            newlyUploadedFileNames.push(result.value.fileName);
          } else {
            fileUploadFailureCount++;
            console.error("Single file upload error:", result.value?.message || result.reason);
          }
        });

        if (newlyUploadedFileNames.length > 0) {
          setFormState(prev => ({
            ...prev,
            existingFileNames: [...prev.existingFileNames, ...newlyUploadedFileNames]
          }));
        }

        if (fileUploadSuccessCount > 0) {
          finalFileMessage += `. ${fileUploadSuccessCount} file uploaded and linked!`;
        }
        if (fileUploadFailureCount > 0) {
          finalFileMessage += `. ${fileUploadFailureCount} file failed to upload.`;
        }
      }

      // --- STEP 3: Show final status and clear form (or just close) ---
      let finalMessage = `AI Agent '${formState.name}' ${isEditMode ? 'updated' : 'created'} successfully`;
      finalMessage += finalFileMessage;

      if (fileUploadSuccessCount > 0 && fileUploadFailureCount === 0) {
        setSnackbar({ open: true, message: finalMessage, severity: 'success' });
      } else if (fileUploadFailureCount > 0) {
        setSnackbar({ open: true, message: finalMessage, severity: 'warning' });
      } else {
        setSnackbar({ open: true, message: finalMessage, severity: 'success' });
      }

      // Clear staged files and call onSuccess to refresh the agent list/data
      setFormState(prev => ({ ...prev, knowledgeBaseFiles: [] }));
      onSuccess();

    } catch (error) {
      console.error("UNHANDLED CRASH DURING AGENT SAVE:", error);
      setSnackbar({ open: true, message: `An unexpected system error occurred: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }

  }, [formState, onSubmit, onSuccess]);

  // --- MEMOIZED STYLES (Omitted for brevity, assume unchanged) ---
  const drawerPaperProps = useMemo(() => ({
    sx: {
      width: '500px',
      p: 0,
      borderTopLeftRadius: '24px',
      borderBottomLeftRadius: '24px',
      boxShadow: '-5px 0px 20px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden',
    },
  }), []);

  const commonTextFieldSx = useMemo(() => ({
    backgroundColor: 'rgba(238, 238, 238, 1)',
    borderRadius: 2,
    '& fieldset': { border: 'none' },
  }), []);

  const headerSx = useMemo(() => ({
    p: 2,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(238, 240, 245, 1)',
  }), []);

  const contentSx = useMemo(() => ({
    p: 3,
    flexGrow: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  }), []);

  const generateButtonSx = useMemo(() => ({
    backgroundColor: '#00A3E0',
    textTransform: 'none',
    color: 'white',
    fontWeight: 'bold',
    boxShadow: 'none',
  }), []);

  const backButtonSx = useMemo(() => ({
    backgroundColor: 'rgba(230, 230, 230, 1)',
    color: 'rgba(0, 0, 0, 1)',
    textTransform: 'none',
    width: '100px',
    borderRadius: '2',
  }), []);

  const saveButtonSx = useMemo(() => ({
    backgroundColor: 'rgba(31, 44, 94, 1)',
    textTransform: 'none',
    width: '100px',
    color: 'rgba(255, 255, 255, 1)',
    borderRadius: '2',
  }), []);

  // Dynamic Title
  const shortId = formState.displayId;
  const drawerTitle = initialData
    ? `Agent: ${shortId || 'N/A'}` // Added "Agent:" for clarity
    : 'New AI Agent';


  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      BackdropProps={{ invisible: true }}
      PaperProps={drawerPaperProps}
    >
      {/* Header */}
      <Box sx={headerSx}>
        <Typography variant="h6" sx={{ color: 'rgba(0, 0, 0, 1)' }}>
          {drawerTitle}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Scrollable Content */}
      <Box sx={contentSx}>

        {/* Section 1: Model */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'rgba(0, 0, 0, 1)' }}>
            <img src={ModelIcon} alt="model" style={{ width: 20, height: 20 }} />
            <Typography fontWeight="400">Model</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FormLabel required>Name</FormLabel>
              <TextField
                fullWidth
                size="small"
                placeholder="Neha"
                name="name"
                value={formState.name}
                onChange={handleChange}
                sx={commonTextFieldSx}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormLabel required>Voice</FormLabel>
              <Select
                fullWidth
                size="small"
                name="voice"
                value={formState.voice}
                onChange={handleChange}
                IconComponent={CustomSelectIcon}
                sx={{
                  ...commonTextFieldSx,
                  '& .MuiSelect-icon': { top: 'calc(50% - 6px)' },
                }}
              >
                <MenuItem value="Elliot">Elliot</MenuItem>
                <MenuItem value="Cope">Cope</MenuItem>
                <MenuItem value="Shimmer">Shimmer</MenuItem>
              </Select>
            </Box>
          </Box>

          <Box>
            <FormLabel>Status</FormLabel>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Is Active?
              </Typography>
              <GreenSwitch
                checked={formState.status}
                onChange={handleChange}
                name="status"
              />
            </Box>
          </Box>
        </Box>

        {/* Section 2: Train AI (System Prompt Block) */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <img src={TrainIcon} alt="train" style={{ width: 20, height: 20 }} />
            <Typography fontWeight="600">Train Your AI Agent</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ mb: 2 }}>
            <FormLabel>Create Prompt</FormLabel>
            <TextField
              fullWidth
              size="small"
              placeholder="Describe what you'd like in prompt"
              name="createPrompt"
              value={formState.createPrompt}
              onChange={handleChange}
              sx={{
                ...commonTextFieldSx,
                mb: 1,
              }}
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={<img src={GenerateIcon} alt="generate" style={{ width: 18, height: 18 }} />}
              onClick={handleGeneratePrompt}
              sx={generateButtonSx}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormLabel>System Prompt</FormLabel>
            {/* Editable TextField for System Prompt */}
            <TextField
              fullWidth
              multiline
              minRows={6}
              name="systemPrompt"
              value={formState.systemPrompt}
              onChange={handleChange}
              placeholder="Type your System Prompt here, or use the Generate button above."
              sx={{
                ...commonTextFieldSx,
                p: 1,
                border: formState.systemPrompt ? 'none' : '2px dashed rgba(69, 69, 69, 0.6)',
                '& fieldset': { border: 'none' }
              }}
            />
          </Box>
        </Box>

        {/* Section 3: Knowledge Base (File Upload) - 🌟 UPDATED FOR MULTI-FILE LAYOUT & DELETION */}
        <Box>
          {/* File Input - Hidden, triggered by the Upload Box */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt"
            multiple // Allow multiple file selection
            style={{ display: 'none' }}
          />

          {/* Upload Box - Click to trigger file selection */}
          <Box
            onClick={handleFileUploadClick} // Simplified to always trigger file select
            sx={{
              border: '2px dashed rgba(69, 69, 69, 0.6)',
              borderRadius: 2,
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(238, 238, 238, 1)',
              cursor: 'pointer', // Make it clear it's clickable
            }}
          >
            <img src={UploadIcon} alt="upload" style={{ width: 30, height: 30, marginBottom: 8 }} />
            <Typography variant="subtitle2" fontWeight="bold" color="rgba(0, 0, 0, 1)">
              Upload Company Knowledge Base
            </Typography>
            <Typography variant="caption" color="rgba(69, 69, 69, 1)" display="block">
              Upload your details file(s) to train or refine the AI assistant.
            </Typography>
            <Typography variant="caption" color="rgba(69, 69, 69, 1)">
              Supported formats: **.TXT**
            </Typography>
          </Box>

          {/* 🌟 NEW: Display Uploaded/Staged Files in a Grid Layout (3 per row) */}
          {(formState.existingFileNames.length > 0 || formState.knowledgeBaseFiles.length > 0) && (
            <Box sx={{ mt: 2, p: 1, borderRadius: 1, backgroundColor: 'white' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                {/* Files ({formState.existingFileNames.length + formState.knowledgeBaseFiles.length} total): */}
              </Typography>

              <Grid container spacing={1}>
                {/* List Existing Files - Deletable */}
                {formState.existingFileNames.map((fileName, index) => (
                  <Grid item xs={4} key={`existing-${index}`}> {/* 4 * 3 = 12 (1 row) */}
                    <FileDisplayComponent
                      name={fileName}
                      isNew={false}
                      onDelete={() => handleRemoveExistingFile(fileName)} // 🌟 Added delete handler for existing files
                    />
                  </Grid>
                ))}

                {/* List New Staged Files - Deletable */}
                {formState.knowledgeBaseFiles.map((file, index) => (
                  <Grid item xs={4} key={`new-${index}`}> {/* 4 * 3 = 12 (1 row) */}
                    <FileDisplayComponent
                      name={file.name}
                      isNew={true}
                      onDelete={() => handleRemoveStagedFile(file)} // Delete handler for staged files
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#0056b3', textAlign: 'center' }}>
                {formState.knowledgeBaseFiles.length > 0
                  ? `Click 'Save' to upload ${formState.knowledgeBaseFiles.length} selected file(s).`
                  : "No new files saved for upload."}
              </Typography>
            </Box>
          )}

        </Box>

        {/* Section 4: Output Language */}
        <Box>
          <FormLabel required>Transcript Output Language</FormLabel>
          <TextField
            fullWidth
            size="small"
            placeholder="English"
            name="transcriptOutputLanguage"
            value={formState.transcriptOutputLanguage}
            onChange={handleChange}
            sx={{
              ...commonTextFieldSx,
              '& .MuiInputBase-input': { color: 'rgba(0, 0, 0, 1)' },
            }}
          />
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: '1px solid #e0e0e0' }}>
        <Button
          onClick={onClose}
          sx={backButtonSx}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={saveButtonSx}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Drawer>
  );
};

export default AddAgentForm;