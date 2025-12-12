<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Device;
use App\Actions\Device\RegisterDevice;
use App\Http\Requests\DeviceRegisterRequest;

class DeviceAuthApiController extends Controller
{
    // Utility: check for private/local IPv4 (10.*, 192.168.*, 172.16-31.*, 169.254.*)
    protected function isPrivateIp(?string $ip): bool
    {
        if (!$ip) return false;
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return false;

        if (str_starts_with($ip, '10.')) return true;
        if (str_starts_with($ip, '192.168.')) return true;
        if (preg_match('/^172\\.(1[6-9]|2[0-9]|3[0-1])\\./', $ip)) return true;
        if (str_starts_with($ip, '169.254.')) return true;

        return false;
    }

    public function register(DeviceRegisterRequest $request)
    {
        $validated = $request->validated();

        // Prefer client-supplied ip_address when it looks like a LAN/private IP.
        $clientSupplied = $request->input('ip_address');
        $requestIp = $request->ip();

        $ipToUse = null;
        if ($clientSupplied && $this->isPrivateIp($clientSupplied)) {
            $ipToUse = $clientSupplied;
        } elseif ($this->isPrivateIp($requestIp)) {
            $ipToUse = $requestIp;
        } else {
            // Neither is private; still use request IP (best-effort)
            $ipToUse = $requestIp;
        }

        $validated['ip_address'] = $ipToUse;

        // Prefer code-based uniqueness if provided
        $existing = null;
        if (!empty($validated['code'])) {
            $existing = Device::where('code', $validated['code'])->first();
        }

        if (!$existing && $ipToUse) {
            $existing = Device::where('ip_address', $ipToUse)->first();
        }

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Device already registered',
                'device' => $existing,
                'ip_used' => $ipToUse,
            ], 409);
        }

        $device = RegisterDevice::run($validated);

        $token = $device->createToken(
            name: 'device-auth',
            expiresAt: now()->addDays(7)
        )->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'device' => $device,
            'table' => $device->table()->first(['id', 'name']),
            'expires_at' => now()->addDays(7)->toDateTimeString(),
            'ip_used' => $ipToUse,
        ], 201);
    }

    public function authenticate(Request $request)
    {
        $clientSupplied = $request->input('ip_address');
        $requestIp = $request->ip();

        if ($clientSupplied && $this->isPrivateIp($clientSupplied)) {
            $ip = $clientSupplied;
        } else {
            $ip = $requestIp;
        }

        $device = Device::where(['ip_address' => $ip, 'is_active' => true])->first();

        if (!$device) {
            return response()->json([
                'success' => false,
                'error' => 'Device not found',
                'ip_address' => $ip
            ], 404);
        }

        $device->update(['last_seen_at' => now()]);
        $device->tokens()->delete();

        $token = $device->createToken(
            name: 'device-auth',
            expiresAt: now()->addDays(7)
        )->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'device' => $device,
            'table' => $device->table()->first(['id', 'name']),
            'expires_at' => now()->addDays(7)->toDateTimeString(),
            'ip_used' => $ip,
        ]);
    }

    // refresh, logout left unchanged
}
