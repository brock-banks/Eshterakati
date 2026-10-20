<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Arabic copy for catalogue content (English stays the fallback), and the
     * language each order was placed in, so emails and messages match it.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->string('blurb_ar')->nullable()->after('blurb');
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->string('title_ar')->nullable()->after('title');
            $table->string('blurb_ar')->nullable()->after('blurb');
            $table->string('region_ar')->nullable()->after('region');
        });

        Schema::table('deal_options', function (Blueprint $table) {
            $table->string('label_ar')->nullable()->after('label');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('locale', 5)->default('ar')->after('email');
            // A reason code (translated on display) plus the admin's optional note.
            $table->string('rejection_code', 32)->nullable()->after('expires_at');
            $table->string('rejection_note', 200)->nullable()->after('rejection_code');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('rejection_reason', 500)->nullable();
            $table->dropColumn(['locale', 'rejection_code', 'rejection_note']);
        });
        Schema::table('deal_options', fn (Blueprint $table) => $table->dropColumn('label_ar'));
        Schema::table('deals', fn (Blueprint $table) => $table->dropColumn(['title_ar', 'blurb_ar', 'region_ar']));
        Schema::table('categories', fn (Blueprint $table) => $table->dropColumn(['name_ar', 'blurb_ar']));
    }
};
