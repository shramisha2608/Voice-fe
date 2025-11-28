import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Box, Typography } from "@mui/material";
import { MuiButton, MuiInput } from "../../features";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/constant"; 
import AuthLayout from "../../components/authLayout"; // Import the new Layout

// Icons
import EmailIcon from "../../assets/icons/email_icon.svg";
import KeyIcon from "../../assets/icons/password_icon.svg";

const schema = yup.object().shape({
  email: yup.string().trim().required("Email is required.").email("Invalid email format."),
  password: yup.string().required("Password is required."),
  isRemember: yup.boolean(),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    console.log(data);
    navigate(ROUTES.DASHBOARD);
  };

  const inputStyles = {
    mb: 2,
    "& .MuiOutlinedInput-root": { backgroundColor: "#fff", borderRadius: "8px" },
    "& h6.form-label": { color: "rgba(0, 0, 0, 1)", fontWeight: 500, minHeight: "24px", marginBottom: "4px" },
    "& .error": { color: "rgba(193, 7, 1, 1)" },
  };

  return (
    <AuthLayout>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Typography
          sx={{
            fontWeight: "700",
            mb: 1,
            color: "rgba(0, 0, 0, 1)",
            textAlign: "center",
            fontSize: "30px",
          }}
        >
          Login
        </Typography>
        <Typography
          sx={{
            color: "rgba(69, 69, 69, 1)",
            mb: 4,
            fontWeight: "700",
            textAlign: "center",
            fontSize: "15px",
          }}
        >
          Enter your credentials to get in
        </Typography>

        {/* Email Input */}
        <MuiInput
          label="Email"
          isRequired={true}
          placeholder="Enter Email Here"
          {...register("email")}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          endIcon={<img src={EmailIcon} alt="Email" style={{ width: 20, height: 20, marginRight: 20 }} />}
          sx={inputStyles}
        />

        {/* Password Input */}
        <MuiInput
          label="Password"
          isRequired={true}
          type="password"
          placeholder="Enter Password Here"
          {...register("password")}
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
          endIcon={<img src={KeyIcon} alt="Password" style={{ width: 20, height: 20, marginRight: 20 }} />}
          sx={inputStyles}
        />

        {/* Remember Me & Forgot Password */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={3}>
          <Box display="flex" alignItems="center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={watch("isRemember")}
              onChange={(e) => setValue("isRemember", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <label htmlFor="rememberMe" style={{ fontSize: "14px", color: "rgba(0, 0, 0, 1)", fontWeight: 500 }}>
              Remember me?
            </label>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(27, 158, 217, 1)",
              cursor: "pointer",
              fontWeight: 500,
              textDecoration: "underline",
            }}
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </Typography>
        </Box>

        {/* Login Button */}
        <MuiButton
          text={"Login"}
          type="submit"
          fullWidth
          sx={{
            marginTop: "2rem",
            fontWeight: "500",
            backgroundColor: "rgba(31, 44, 94, 1)",
            padding: "6px 30px",
            fontSize: "15px",
            height: "55px",
            "&:hover": { backgroundColor: "rgba(25, 35, 74, 1)" },
          }}
        />
      </Box>
    </AuthLayout>
  );
}