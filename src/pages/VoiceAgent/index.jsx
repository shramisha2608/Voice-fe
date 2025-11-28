import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Switch,
    Dialog,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    IconButton,
    CircularProgress
} from '@mui/material';

// --- Styles ---
import styles from './index.module.css';

// --- Icons ---
import AddIcon from '../../assets/icons/add.svg';
import ConfirmationSvg from '../../assets/icons/inactive.svg';
import ArrowDownIcon from '../../assets/icons/dropdown.svg';

// --- Components ---
import SearchFilter from '../../components/search/Search';
import StatusSelect from '../../components/status/Status';
// Assume AddAgentForm is a reusable Drawer/Form component that accepts initialData
import AddAgentForm from './Form/index';

// --- API Configuration ---
const API_BASE_URL = 'http://localhost:6565/api/v1/admin/agents';

const tableHeaders = ['Agent ID', 'Agent Name', 'Created Date', 'Updated Date', 'Voice', 'Status'];

// --- 0. Date Formatting Helper (Unchanged) ---
const safeFormatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'N/A';
    }
    return date.toLocaleDateString('en-GB');
};


// --- 1. Custom Icon & Pagination Components (Unchanged) ---
const CustomSelectIcon = React.memo((props) => {
    // ... (Icon logic)
    return (
        <img
            src={ArrowDownIcon}
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

const CustomPagination = React.memo(({
    count,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
}) => {
    // ... (Pagination logic)
    const from = page * rowsPerPage + 1;
    const to = Math.min((page + 1) * rowsPerPage, count);

    return (
        <Box className={styles.paginationContainer}>
            {/* ... (Pagination JSX) ... */}
            <Box className={styles.rowsSelectWrapper}>
                <Select
                    value={rowsPerPage}
                    onChange={onRowsPerPageChange}
                    variant="standard"
                    disableUnderline
                    IconComponent={CustomSelectIcon}
                    className={styles.paginationSelect}
                    sx={{
                        "& .MuiSelect-select": {
                            padding: "6px 30px 6px 12px !important",
                            display: "flex",
                            alignItems: "center",
                        },
                    }}
                    MenuProps={{ PaperProps: { sx: { borderRadius: "8px", mt: 1 } } }}
                >
                    {[6, 10, 25].map((num) => (
                        <MenuItem key={num} value={num} sx={{ fontSize: "14px" }}>{num}</MenuItem>
                    ))}
                </Select>
            </Box>

            <Typography variant="body2" className={styles.paginationText}>Items per page</Typography>
            <Typography variant="body2" className={`${styles.paginationText} ${styles.paginationTextRange}`}>
                {from}-{to} of {count} items
            </Typography>

            <Box className={styles.paginationArrows}>
                <IconButton
                    onClick={(e) => onPageChange(e, page - 1)}
                    disabled={page === 0}
                    size="small"
                    className={styles.arrowBtn}
                >
                    <Typography className={styles.arrowText}>‹</Typography>
                </IconButton>
                <IconButton
                    onClick={(e) => onPageChange(e, page + 1)}
                    disabled={page * rowsPerPage + rowsPerPage >= count}
                    size="small"
                    className={styles.arrowBtn}
                >
                    <Typography className={styles.arrowText}>›</Typography>
                </IconButton>
            </Box>
        </Box>
    );
});
CustomPagination.displayName = 'CustomPagination';


const AIVoiceAgentPage = () => {
    // --- STATE FOR DATA AND UI (Unchanged) ---
    const [rows, setRows] = useState([]);
    const [totalDocument, setTotalDocument] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState({});

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(6);

    const [openDialog, setOpenDialog] = useState(false);
    const [openSaveDialog, setOpenSaveDialog] = useState(false);
    // 🟢 MODIFIED: This state is used for BOTH Edit Dialog and Disable Dialog
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [openDrawer, setOpenDrawer] = useState(false);

    const getAuthToken = useCallback(() => {
        return null; // Update if token is required
    }, []);

    // --- API FETCH LOGIC (Unchanged) ---
    const fetchAgents = useCallback(async () => {
        setLoading(true);
        setError(null);

        const authToken = getAuthToken();

        // 🟢 MODIFIED: Construct the URL with query parameters
        const statusParam = selectedStatus === 'Active' ? 'ACTIVE' : selectedStatus === 'Inactive' ? 'INACTIVE' : '';
        const limitParam = rowsPerPage;
        const pageParam = page + 1; // Backend typically expects 1-based page index
        const searchParam = searchTerm;

        const url = `${API_BASE_URL}?search=${encodeURIComponent(searchParam)}&status=${encodeURIComponent(statusParam)}&page=${pageParam}&limit=${limitParam}`;
        console.log("Fetching agents with URL:", url); // DEBUGGING

        try {
            const response = await fetch(url, { // Use the constructed URL
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                },
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorMessage = errorBody.message || errorMessage;
                } catch {
                    // 
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();

            // 💡 CRUCIAL: Check the data property and totalDocument property
            if (result.status && Array.isArray(result.data) && result.totalDocument !== undefined) {
                const todayIsoString = new Date().toISOString();
                setTotalDocument(result.totalDocument); // 💡 Save the total count for pagination

                const mappedData = result.data.map((agent, index) => {

                    // 🚨 FIX FOR 403 / Invalid ID Format: Stricter check for a valid backend ID
                    // Prioritize common unique ID fields and ensure it's not null/undefined
                    // NOTE: Use agent.id or agent._id if your service returns them in the data array
                    const uniqueBackendId = agent._id || agent.id || agent.uuid;

                    // This ID is used for table display
                    const displayId = agent.agentId || `V-${index + 1}`;

                    // Disable API operations if the uniqueBackendId is missing or empty
                    const apiDisabled = !uniqueBackendId;

                    const createdDateValue = safeFormatDate(
                        agent.createdAt || agent.created_at || todayIsoString
                    );
                    const updatedDateValue = safeFormatDate(
                        agent.updatedAt || agent.updated_at || todayIsoString
                    );

                    return {
                        id: displayId,
                        agentId:displayId,
                        backendId: uniqueBackendId,
                        apiDisabled: apiDisabled,
                        name: agent.name,
                        voice: agent.voice,
                        systemPrompt: agent.systemPrompt, // Assuming this is the field for 'Train Your AI Agent' content
                        transcriptOutputLanguage: agent.transcriptOutputLanguage || 'English', // New field needed for form
                        // Add any other agent properties needed for the form here (e.g., model)
                        model: agent.model,
                        // Include the native _id field just in case the form needs to access the raw ID
                        _id: agent._id || agent.id,
                        // 🚨 ADD THE MISSING KNOWLEDGE BASE PATH HERE
                        knowledgeBaseFilePath: agent.knowledgeBaseFilePath,
                        knowledgeBaseFileName: agent.knowledgeBaseFileName,
                        createdDate: createdDateValue,
                        updatedDate: updatedDateValue,
                        // Convert status to a boolean for the local state/Switch component
                        status: agent.status === true || agent.status === 'ACTIVE' || agent.status === 'active',
                    };
                });
                setRows(mappedData);
            } else {
                throw new Error(result.message || 'Failed to fetch agent list. Check response format.');
            }

        } catch (err) {
            console.error('Fetch Agent Error:', err);
            setError(err.message || 'Could not load agents.');
            setRows([]); // Clear rows on error
            setTotalDocument(0); // Reset count on error
        } finally {
            setLoading(false);
        }
    }, [getAuthToken, searchTerm, selectedStatus, page, rowsPerPage]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);


    // --- UPDATED API TOGGLE STATUS LOGIC (Unchanged, relies on correct backendId) ---
    const toggleAgentStatusAPI = useCallback(async (backendId, newStatus) => {
        // ... (API Toggle Status Logic - Omitted for brevity, assumed correct)
        const authToken = getAuthToken();
        if (!backendId) return { success: false, message: 'Agent ID for API is missing.' };

        setIsSaving(prev => ({ ...prev, [backendId]: true }));

        try {
            const statusString = newStatus ? 'ACTIVE' : 'INACTIVE';

            const response = await fetch(`${API_BASE_URL}/${backendId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                },
                body: JSON.stringify({ status: statusString }),
            });

            if (!response.ok) {
                let errorBody = null;
                try {
                    errorBody = await response.json();
                } catch (e) {
                    throw new Error(`Server responded with status ${response.status} (Non-JSON Error).`);
                }

                const errorMessage = errorBody?.message || `HTTP Error ${response.status}. Status not saved.`;
                throw new Error(errorMessage);
            }

            const result = await response.json();

            if (result.status) {
                return { success: true, message: result.message };
            } else {
                throw new Error(result.message || `Failed to update status for ${backendId}.`);
            }
        } catch (error) {
            console.error('Toggle Status API FAILED:', error.message);
            setError(`Failed to save status: ${error.message}`);
            return { success: false, message: error.message || 'Network error during status update.' };
        } finally {
            setIsSaving(prev => ({ ...prev, [backendId]: false }));
        }
    }, [getAuthToken]);


    // --- CLEANED API CREATE LOGIC (Unchanged) ---
    const createAgent = useCallback(async (agentData) => {
        const authToken = getAuthToken();
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                },
                body: JSON.stringify(agentData),
            });

            const result = await response.json();
            console.log('[BACKEND RESPONSE DEBUG] Agent Creation API Result:', result);

            if (!response.ok) {
                const errorMessage = result.message || `HTTP Error ${response.status}: Failed to create agent.`;
                throw new Error(errorMessage);
            }

            if (result.status) {
                const finalResult = {
                    success: true,
                    message: result.message,
                    data: result.data || result.agent || result
                };

                // 🟢 Trigger refetch after creation
                fetchAgents();
                return finalResult;

            } else {
                return { success: false, message: result.message || 'Agent creation failed.' };
            }
        } catch (error) {
            console.error('Create Agent Error:', error);
            return { success: false, message: error.message || 'Network or server error during creation.' };
        }
    }, [fetchAgents, getAuthToken]);

    // 🟢 NEW: API UPDATE LOGIC
    const updateAgent = useCallback(async (agentData) => {
        const authToken = getAuthToken();

        // 💡 CRITICAL FIX: The form now includes the ID in the payload as 'id', '_id', or 'agentId'
        // We look for any ID passed back by the form to determine the correct PUT endpoint.
        const backendId = agentData.id || agentData._id || agentData.agentId || agentData.backendId;

        // 🚨 PREVENT API CALL IF ID IS MISSING
        if (!backendId) {
            console.error('[FRONTEND DEBUG] Cannot update agent: Missing backend ID in payload.');
            return { success: false, message: 'Cannot update agent: Missing backend ID.' };
        }

        // IMPORTANT: The payload sent to the backend should NOT include the multiple ID keys 
        // that were used for debugging in the form, only the data fields needed for the update.
        const { id, _id, agentId, backendId: payloadBackendId, ...cleanAgentData } = agentData;
        const apiPayload = cleanAgentData; // Contains name, voice, status, systemPrompt, etc.


        try {
            const response = await fetch(`${API_BASE_URL}/${backendId}`, {
                method: 'PUT', // Use PUT or PATCH for update
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                },
                body: JSON.stringify(apiPayload), // Use the cleaned payload
            });

            const result = await response.json();
            console.log(`[BACKEND RESPONSE DEBUG] Agent Update API Result for ID ${backendId}:`, result);

            if (!response.ok) {
                const errorMessage = result.message || `HTTP Error ${response.status}: Failed to update agent.`;
                throw new Error(errorMessage);
            }

            if (result.status) {
                const finalResult = {
                    success: true,
                    message: result.message || 'Agent updated successfully.',
                    data: result.data || result.agent || result
                };

                // 🟢 Trigger refetch after update
                fetchAgents();
                return finalResult;

            } else {
                return { success: false, message: result.message || 'Agent update failed.' };
            }
        } catch (error) {
            console.error('Update Agent Error:', error);
            return { success: false, message: error.message || 'Network or server error during update.' };
        }
    }, [fetchAgents, getAuthToken]);

    // --- Handlers ---

    const updateAgentStatusLocally = useCallback((backendId, newStatus) => {
        // NOTE: Since the backend now handles filtering/pagination, this local update is mainly for UX
        // The next `fetchAgents` will refresh the data from the server
        setRows(currentRows =>
            currentRows.map((row) => row.backendId && row.backendId === backendId ? { ...row, status: newStatus } : row)
        );
    }, []);

    // BASE UI HANDLERS (MODIFIED: Reset page to 0 on filter change)
    const handleSearchChange = useCallback((e) => { setSearchTerm(e.target.value); setPage(0); }, []);
    const handleStatusChange = useCallback((e) => { setSelectedStatus(e.target.value); setPage(0); }, []);
    const handlePageChange = useCallback((e, newPage) => setPage(newPage), []);
    // MODIFIED: Fetch agents immediately when page/rows change
    const handleRowsChange = useCallback((e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }, []);


    // DIALOG HANDLERS (Unchanged)
    const handleCloseDialog = useCallback(() => {
        setOpenDialog(false);
        setSelectedAgent(null); // Reset agent after closing the disable dialog
    }, []);
    const handleSaveClick = useCallback(() => { setOpenSaveDialog(true); }, []);
    const handleCloseSaveDialog = useCallback(() => { setOpenSaveDialog(false); }, []);
    const handleConfirmSave = useCallback(() => {
        setOpenSaveDialog(false);
        setOpenDrawer(false);
        // 🟢 Reset selected agent when the drawer closes (whether saved or discarded)
        setSelectedAgent(null);
        fetchAgents();
    }, [fetchAgents]);

    // DRAWER HANDLERS 
    const handleAddAgentClick = useCallback(() => {
        // 🟢 CRITICAL: Reset selectedAgent to null for 'Add' mode
        setSelectedAgent(null);
        setOpenDrawer(true);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setOpenDrawer(false);
        // 🟢 Reset selectedAgent when the drawer closes 
        setSelectedAgent(null);
    }, []);

    // 🟢 NEW: Row click handler - sets data for edit mode
    const handleRowClick = useCallback((agent) => {
        // 💡 This is the crucial step: pass the fully mapped agent object 
        // containing all required fields (like backendId, name, systemPrompt, etc.)
        setSelectedAgent(agent);
        setOpenDrawer(true); // Open the drawer with the agent's data
    }, []);


    const handleConfirmDisable = useCallback(async () => {
        if (!selectedAgent) return;

        const agentBackendId = selectedAgent.backendId;

        if (!agentBackendId) {
            setError(`Cannot disable agent ${selectedAgent.id}: Missing API ID.`);
            handleCloseDialog();
            return;
        }

        const result = await toggleAgentStatusAPI(agentBackendId, false);

        if (result.success) {
            updateAgentStatusLocally(agentBackendId, false);
            handleCloseDialog();
        } else {
            handleCloseDialog();
        }
    }, [selectedAgent, handleCloseDialog, toggleAgentStatusAPI, updateAgentStatusLocally]);


    // 🚨 IMPROVED ID CHECK IN SWITCH HANDLER (Unchanged)
    const handleSwitchToggle = useCallback(async (agent) => {
        // Check 1: Use the apiDisabled flag set in fetchAgents
        if (agent.apiDisabled) {
            setError(`Cannot update status for agent ${agent.id}: Unique backend ID is missing or invalid.`);
            return;
        }

        const newStatus = !agent.status;
        const agentBackendId = agent.backendId;

        // Check 2: Final sanity check before proceeding to API
        if (!agentBackendId) {
            setError(`Cannot update status for agent ${agent.id}: Unique backend ID is null or undefined.`);
            return;
        }


        if (newStatus === false) {
            setSelectedAgent(agent);
            setOpenDialog(true);
            return;
        }

        const result = await toggleAgentStatusAPI(agentBackendId, newStatus);

        if (result.success) {
            updateAgentStatusLocally(agentBackendId, newStatus);
        } else {
            console.error("Status update failed:", result.message);
        }
    }, [toggleAgentStatusAPI, updateAgentStatusLocally]);


    // --- Filtered Data and Pagination (Unchanged) ---
    const paginatedData = rows;
    const totalCount = totalDocument;


    return (
        <Paper className={styles.pageContainer}>
            {/* ... (Header, Loading/Error States) ... */}

            {/* Header */}
            <Box className={styles.header}>
                <Typography variant="h6" className={styles.title}>AI Agents</Typography>
                <Box className={styles.filtersContainer}>
                    <Box className={styles.searchWrapper}>
                        <SearchFilter searchTerm={searchTerm} onSearchChange={handleSearchChange} />
                    </Box>
                    <Box className={styles.statusWrapper}>
                        <StatusSelect selectedStatus={selectedStatus} onStatusChange={handleStatusChange} statuses={['Active', 'Inactive']} />
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<img src={AddIcon} alt="add" style={{ width: '14px', height: '14px' }} />}
                        onClick={handleAddAgentClick}
                        className={styles.addButton}
                    >
                        Add AI Agent
                    </Button>
                </Box>
            </Box>


            {/* Loading/Error States (Unchanged) */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={30} />
                    <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading agents...</Typography>
                </Box>
            )}

            {error && !loading && (
                <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>
                    <Typography variant="body1">Error: {error}</Typography>
                    <Button onClick={fetchAgents} sx={{ mt: 1 }}>Retry Load</Button>
                </Box>
            )}


            {/* Table */}
            {!loading && !error && (
                <TableContainer className={styles.tableContainer}>
                    <Table stickyHeader aria-label="ai agents table">
                        <TableHead>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <TableCell key={header} className={styles.tableHeaderCell}>{header}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* 💡 Use paginatedData (which is now just `rows`) */}
                            {paginatedData.map((agent, index) => (
                                <TableRow key={agent.id || index} className={styles.tableBodyRow}
                                    // 🟢 ADDED: Make the entire row clickable to open the edit drawer
                                    onClick={() => handleRowClick(agent)}
                                    // 💡 Optional: Add a style for better UX
                                    sx={{ cursor: 'pointer' }}>
                                    <TableCell className={styles.tableBodyCell}>{agent.id}</TableCell>
                                    <TableCell className={styles.tableBodyCell}>{agent.name}</TableCell>
                                    <TableCell className={styles.tableBodyCell}>{agent.createdDate}</TableCell>
                                    <TableCell className={styles.tableBodyCell}>{agent.updatedDate}</TableCell>
                                    <TableCell className={styles.tableBodyCell}>{agent.voice}</TableCell>
                                    <TableCell className={styles.tableBodyCell}>
                                        <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                            <Switch
                                                className={styles.greenSwitch}
                                                checked={agent.status}
                                                onChange={() => handleSwitchToggle(agent)}
                                                // Disable switch if saving or if the agent has no valid backend ID
                                                disabled={isSaving[agent.backendId] || agent.apiDisabled}
                                                disableRipple
                                            />
                                            {/* Show loading spinner over the switch while the API call is in progress */}
                                            {isSaving[agent.backendId] && (
                                                <CircularProgress
                                                    size={20}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        marginTop: '-10px',
                                                        marginLeft: '-10px',
                                                        color: '#1a90ff',
                                                    }}
                                                />
                                            )}
                                            {/* Optional: Add a visual indicator if API is disabled */}
                                            {agent.apiDisabled && (
                                                <Typography variant="caption" color="error" sx={{ ml: 1, fontSize: '10px' }}>
                                                    No API ID
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* 💡 Check against totalCount for No Agents found (Unchanged) */}
                            {totalCount === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" className={styles.noDataCell}>
                                        <Typography variant="body2" color="text.secondary">No Agents found.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Custom Pagination (Unchanged) */}
            {!loading && totalCount > 0 && (
                <CustomPagination
                    count={totalCount}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handlePageChange}
                    onRowsPerPageChange={handleRowsChange}
                />
            )}


            {/* --- Dialogs (Unchanged) --- */}
            <Dialog open={openDialog} onClose={handleCloseDialog} PaperProps={{ className: styles.dialogPaper }}>
                <DialogContent className={styles.dialogContent}>
                    <Typography variant="h6" className={styles.dialogTitle}>
                        Are you sure you want to <br /> Inactivate **{selectedAgent?.name}**?
                    </Typography>
                    <Box sx={{ my: 1 }}><img src={ConfirmationSvg} alt="confirm" style={{ width: '140px' }} /></Box>
                </DialogContent>
                <DialogActions className={styles.dialogActions}>
                    <Button onClick={handleCloseDialog} variant="contained" className={styles.dialogBtnNo}>No</Button>
                    <Button
                        onClick={handleConfirmDisable}
                        variant="contained"
                        className={styles.dialogBtnYes}
                        disabled={isSaving[selectedAgent?.backendId]}
                    >
                        {isSaving[selectedAgent?.backendId] ? <CircularProgress size={24} /> : 'Yes'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog} PaperProps={{ className: styles.dialogPaper }}>
                <DialogContent className={styles.dialogContent}>
                    <Typography variant="h6" className={styles.dialogTitle}>
                        Are you sure you want to save <br /> the changes?
                    </Typography>
                    <Box sx={{ my: 1 }}><img src={ConfirmationSvg} alt="confirm save" style={{ width: '140px' }} /></Box>
                </DialogContent>
                <DialogActions className={styles.dialogActions}>
                    <Button onClick={handleCloseSaveDialog} variant="contained" className={styles.dialogBtnNo}>Discard</Button>
                    <Button onClick={handleConfirmSave} variant="contained" className={styles.dialogBtnYes}>Save</Button>
                </DialogActions>
            </Dialog>


            {/* --- Add/Edit Agent Form --- */}
            <AddAgentForm
                open={openDrawer}
                onClose={handleCloseDrawer}
                // 🟢 Correct: Conditionally set the API function
                onSubmit={selectedAgent ? updateAgent : createAgent}
                onSuccess={handleConfirmSave}
                // 🟢 Correct: Pass the selected agent data to pre-fill the form fields
                initialData={selectedAgent}
            />

        </Paper>
    );
};

export default AIVoiceAgentPage;