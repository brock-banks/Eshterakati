<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('icon');
            $table->unsignedSmallInteger('hue');
            $table->string('blurb');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('deals', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('merchant');
            $table->string('title');
            $table->string('blurb');
            $table->unsignedSmallInteger('hue');
            $table->string('region')->default('Worldwide');
            $table->decimal('rating', 2, 1)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->unsignedInteger('sold_count')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'category_id']);
        });

        // Money is stored in minor units of the store currency (config shop.currency).
        // The label carries the card's own denomination, e.g. "$25".
        Schema::create('deal_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->unsignedBigInteger('price_minor');
            $table->unsignedBigInteger('compare_at_minor')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('reference', 16)->unique();
            $table->text('access_token');
            $table->string('phone', 20);
            $table->string('email')->nullable();
            $table->string('status');
            $table->string('currency', 3);
            $table->unsignedBigInteger('total_minor');
            $table->string('payment_method', 32);
            $table->timestamp('expires_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'expires_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('deal_option_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('quantity');
            $table->unsignedBigInteger('unit_price_minor');
            $table->timestamps();
        });

        // Inventory of codes. The code itself is encrypted at rest (see CouponCode casts).
        Schema::create('coupon_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_option_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->text('code');
            $table->string('status')->default('available');
            $table->timestamp('sold_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['deal_option_id', 'status']);
        });

        Schema::create('payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('disk');
            $table->string('path');
            $table->string('mime', 64);
            $table->unsignedInteger('size');
            $table->char('sha256', 64)->index();
            $table->string('transaction_reference', 64)->index();
            $table->string('status');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_receipts');
        Schema::dropIfExists('coupon_codes');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('deal_options');
        Schema::dropIfExists('deals');
        Schema::dropIfExists('categories');
    }
};
