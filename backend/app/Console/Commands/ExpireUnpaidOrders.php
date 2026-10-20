<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('orders:expire')]
#[Description('Expire unpaid orders past their payment window and return their codes to stock')]
class ExpireUnpaidOrders extends Command
{
    public function handle(): int
    {
        $expired = 0;

        Order::where('status', OrderStatus::AwaitingPayment)
            ->where('expires_at', '<', now())
            ->each(function (Order $order) use (&$expired) {
                $expired += (int) $order->expireIfDue();
            });

        $this->info("Expired {$expired} order(s).");

        return self::SUCCESS;
    }
}
