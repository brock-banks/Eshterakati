<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A customer's report that a code doesn't work, and how it was resolved.
     */
    public function up(): void
    {
        Schema::create('problem_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('coupon_code_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('locale', 5)->default('ar');
            $table->string('reason', 32);
            $table->text('details')->nullable();
            $table->string('screenshot_path')->nullable();
            $table->string('preference', 16);
            // Where to send a refund. The account number is encrypted (see casts).
            $table->string('refund_method', 32)->nullable();
            $table->string('refund_account_name', 100)->nullable();
            $table->text('refund_account_number')->nullable();
            $table->string('status', 16)->index();
            $table->foreignId('replacement_code_id')->nullable()->constrained('coupon_codes')->nullOnDelete();
            $table->unsignedBigInteger('refund_amount_minor')->nullable();
            $table->string('refund_reference', 64)->nullable();
            $table->string('decline_code', 32)->nullable();
            $table->string('resolution_note', 300)->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('problem_reports');
    }
};
